import Link from "next/link";
import { Mapa, type Marcador } from "@/components/mapa";
import { TarjetaReserva, type ReservaFila } from "@/components/tarjeta-reserva";
import { UbicacionBodega } from "@/components/ubicacion-bodega";
import { hoyCO, ocupacionDia, sumarDias, type Movimiento } from "@/lib/agenda";
import { ESTADOS_RESERVA } from "@/lib/cobro";
import { pesos, rangoCO } from "@/lib/medellin";

export type CompaniaPanel = {
  id: string;
  nombre: string;
  zona: string | null;
  ciudad: string;
  creado: string;
  verificada: boolean;
  lat: number | null;
  lng: number | null;
};
export type BloqueoPanel = { equipo_id: string; cantidad: number; desde: string; hasta: string };

const neto = (r: ReservaFila) => r.alquiler + r.transporte + r.tecnico - r.comision;

// Panel de la compañía (solo dibuja; los datos los trae la página).
export function PanelVista({
  c,
  reservas,
  equipos,
  bloqueos,
}: {
  c: CompaniaPanel;
  reservas: ReservaFila[];
  equipos: { id: string; unidades: number }[];
  bloqueos: BloqueoPanel[];
}) {
  const pendientes = reservas.filter((r) => r.estado === "pendiente");
  const enCurso = reservas.filter((r) => r.estado === "confirmada" || r.estado === "en_curso");
  const historial = reservas
    .filter((r) => ["completada", "cancelada", "rechazada"].includes(r.estado))
    .sort((a, b) => (b.actualizado ?? b.creado).localeCompare(a.actualizado ?? a.creado))
    .slice(0, 6);

  // Indicadores
  const mesActual = hoyCO().slice(0, 7);
  const liquidadoMes = reservas
    .filter((r) => r.estado === "completada" && (r.actualizado ?? "").slice(0, 7) === mesActual)
    .reduce((a, r) => a + neto(r), 0);
  const nombreMes = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", month: "long" }).format(new Date());
  const movs: Movimiento[] = [
    ...[...pendientes, ...enCurso].flatMap((r) =>
      r.reserva_items.map((i) => ({ equipo_id: i.equipo_id, cantidad: i.cantidad, desde: r.entrega, hasta: r.recogida, bloqueo: false })),
    ),
    ...bloqueos.map((b) => ({ ...b, bloqueo: true })),
  ];
  const hoy = hoyCO();
  const dias = Array.from({ length: 14 }, (_, i) => sumarDias(hoy, i));
  const capacidad = equipos.reduce((a, e) => a + e.unidades * dias.length, 0);
  const ocupado = equipos.reduce(
    (a, e) =>
      a +
      dias.reduce((b, d) => {
        const o = ocupacionDia(movs, e.id, d);
        return b + Math.min(e.unidades, o.usadas + o.bloqueadas);
      }, 0),
    0,
  );
  const ocupacion = capacidad ? Math.round((ocupado / capacidad) * 100) : 0;
  const desde = new Date(c.creado).getFullYear();

  // Mapa: la bodega y los lugares a donde va el equipo.
  const marcadores: Marcador[] = [];
  if (c.lat !== null && c.lng !== null) {
    marcadores.push({ id: "bodega", lat: Number(c.lat), lng: Number(c.lng), texto: "Tu bodega", tipo: "lugar" });
  }
  const destinos = new Map<string, { lat: number; lng: number }>();
  for (const r of [...pendientes, ...enCurso]) {
    const rr = r as ReservaFila & { lugar_lat?: number | null; lugar_lng?: number | null };
    if (rr.modalidad === "entrega" && rr.lugar_lat != null && rr.lugar_lng != null)
      destinos.set(rr.lugar_nombre, { lat: Number(rr.lugar_lat), lng: Number(rr.lugar_lng) });
  }
  destinos.forEach((p, nombre) => marcadores.push({ id: nombre, ...p, texto: nombre, tipo: "lugar" }));

  return (
    <>
      <div className="page-hd">
        <div>
          <h1 className="title-lg">{c.nombre}</h1>
          <p className="muted">
            Bodega en {c.zona ?? c.ciudad} · en ENRENTA desde {desde} ·{" "}
            {c.verificada ? <span className="ok-txt">✓ Verificada</span> : <span className="warn-txt">En revisión</span>}
          </p>
        </div>
        <div className="row-actions">
          <Link href="/tengo/inventario" className="btn">Ver inventario y agenda</Link>
          <Link href="/tengo/inventario/nuevo" className="btn primary">Publicar equipo</Link>
        </div>
      </div>

      <div className="kpis">
        <div className={`card kpi ${pendientes.length ? "alerta" : ""}`}>
          <span className="lbl">Solicitudes por responder</span>
          <b>{pendientes.length}</b>
          <span className="fine">{pendientes.length ? `${pesos(pendientes.reduce((a, r) => a + neto(r), 0))} en juego` : "Al día"}</span>
        </div>
        <div className="card kpi">
          <span className="lbl">Por liquidar</span>
          <b>{pesos(enCurso.reduce((a, r) => a + neto(r), 0))}</b>
          <span className="fine">
            {enCurso.length} {enCurso.length === 1 ? "reserva confirmada" : "reservas confirmadas"}; se paga al registrar la devolución
          </span>
        </div>
        <div className="card kpi">
          <span className="lbl">Liquidado en {nombreMes}</span>
          <b>{pesos(liquidadoMes)}</b>
          <span className="fine">ya descontada la comisión</span>
        </div>
        <div className="card kpi">
          <span className="lbl">Ocupación · 14 días</span>
          <b>{ocupacion} %</b>
          <span className="fine">unidades-día reservadas o bloqueadas</span>
        </div>
      </div>

      {!c.verificada && (
        <p className="note">
          ENRENTA revisa los datos de tu compañía antes de mostrar el sello de verificada. Mientras tanto ya puedes publicar y
          recibir reservas.
        </p>
      )}

      <div className="panel">
        <div className="panel-main">
          {equipos.length === 0 && (
            <div className="card">
              <h2>Publica tu primer equipo</h2>
              <p className="muted">Cuando publiques el primero, tu compañía aparece en el mapa de Medellín.</p>
              <Link href="/tengo/inventario/nuevo" className="btn primary" style={{ justifySelf: "start" }}>
                + Publicar equipo
              </Link>
            </div>
          )}

          <section className="bk-list" aria-label="Solicitudes por responder">
            <div className="sec-hd">
              <h2>Solicitudes por responder</h2>
              <span className="fine">Las unidades quedan apartadas hasta que respondas</span>
            </div>
            {pendientes.length ? (
              pendientes.map((r) => <TarjetaReserva key={r.id} r={r} vista="compania" />)
            ) : (
              <p className="vacio">No tienes solicitudes pendientes.</p>
            )}
          </section>

          <section className="bk-list" aria-label="Confirmadas y en curso">
            <div className="sec-hd">
              <h2>Confirmadas y en curso</h2>
              <span className="fine">Registra la salida y la devolución con fotos desde aquí</span>
            </div>
            {enCurso.length ? (
              enCurso.map((r) => <TarjetaReserva key={r.id} r={r} vista="compania" />)
            ) : (
              <p className="vacio">No tienes reservas confirmadas.</p>
            )}
          </section>
        </div>

        <aside className="panel-side">
          <section className="card side-card">
            <div className="sec-hd">
              <h2>A dónde va tu equipo</h2>
              <span className="fine">
                {destinos.size} {destinos.size === 1 ? "lugar" : "lugares"}
              </span>
            </div>
            <div className="mapa-side">
              <Mapa etiqueta="Mapa con tu bodega y los lugares de tus reservas" marcadores={marcadores} encuadrar zoom={12} />
            </div>
          </section>

          <section className="card side-card">
            <h2>Historial reciente</h2>
            {historial.length ? (
              <ul className="mini-list">
                {historial.map((r) => {
                  const est = ESTADOS_RESERVA[r.estado];
                  return (
                    <li key={r.id}>
                      <span>
                        <b>{r.codigo}</b> {r.cliente_nombre}
                        <span className="fine bloque">{rangoCO(r.entrega, r.recogida)}</span>
                      </span>
                      <span className={`tag ${est?.tono ?? ""}`}>{est?.texto ?? r.estado}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="fine">Aquí verás las reservas cerradas, canceladas o rechazadas.</p>
            )}
          </section>

          <section className="card side-card">
            <h2>Ubicación de tu bodega</h2>
            <p className="fine">Mueve el pin hasta la puerta para que las distancias y el transporte sean exactos.</p>
            <UbicacionBodega
              companiaId={c.id}
              inicial={c.lat !== null && c.lng !== null ? { lat: Number(c.lat), lng: Number(c.lng) } : null}
            />
          </section>
        </aside>
      </div>
    </>
  );
}
