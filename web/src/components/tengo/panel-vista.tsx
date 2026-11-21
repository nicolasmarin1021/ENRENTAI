import Link from "next/link";
import { Mapa, type Marcador } from "@/components/mapa";
import { TarjetaReserva, type ReservaFila } from "@/components/tarjeta-reserva";
import { UbicacionBodega } from "@/components/ubicacion-bodega";
import { hoyCO, ocupacionDia, sumarDias, type Movimiento } from "@/lib/agenda";
import { Estrellas, ListaResenas } from "@/components/resenas";
import { ESTADOS_RESERVA } from "@/lib/cobro";
import { pesos, rangoCO } from "@/lib/medellin";
import { promedioTexto, type Resena } from "@/lib/resenas";

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

// BETA: precio de referencia de la solicitud (sin comisión de ENRENTA).
const valor = (r: ReservaFila) => r.alquiler + r.transporte + r.tecnico;
// Rentada y todavía no ha pasado la recogida (las ya terminadas pasan al historial).
const vigente = (r: ReservaFila) => Date.parse(r.recogida) >= Date.now();

// Panel de la compañía (solo dibuja; los datos los trae la página).
export function PanelVista({
  c,
  reservas,
  equipos,
  bloqueos,
  resenas,
  verificados = [],
}: {
  c: CompaniaPanel;
  reservas: ReservaFila[];
  equipos: { id: string; unidades: number }[];
  bloqueos: BloqueoPanel[];
  resenas: Resena[];
  verificados?: string[]; // solicitudes cuyo cliente tiene la identidad verificada
}) {
  const pendientes = reservas.filter((r) => r.estado === "pendiente");
  const rentada = (r: ReservaFila) => r.estado === "confirmada" || r.estado === "en_curso";
  const enCurso = reservas.filter((r) => rentada(r) && vigente(r));
  const historial = reservas
    .filter((r) => ["completada", "cancelada", "rechazada"].includes(r.estado) || (rentada(r) && !vigente(r)))
    .sort((a, b) => (b.actualizado ?? b.creado).localeCompare(a.actualizado ?? a.creado))
    .slice(0, 6);

  // Indicadores
  const mesActual = hoyCO().slice(0, 7);
  const contactosMes = reservas.filter((r) => r.creado.slice(0, 7) === mesActual).length;
  const nombreMes = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", month: "long" }).format(new Date());
  // Solo las rentadas (y los bloqueos) apartan equipo en la agenda.
  const movs: Movimiento[] = [
    ...enCurso.flatMap((r) =>
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
  const promedio = resenas.length ? resenas.reduce((a, r) => a + r.estrellas, 0) / resenas.length : 0;
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
            {c.verificada ? <span className="ok-txt">✓ Verificada</span> : <span className="warn-txt">Sin verificar</span>}
          </p>
        </div>
        <div className="row-actions">
          <Link href="/tengo/inventario" className="btn">Ver inventario y agenda</Link>
          <Link href="/tengo/inventario/nuevo" className="btn primary">Publicar equipo</Link>
        </div>
      </div>

      <div className="kpis">
        <div className={`card kpi ${pendientes.length ? "alerta" : ""}`}>
          <span className="lbl">Solicitudes por confirmar</span>
          <b>{pendientes.length}</b>
          <span className="fine">{pendientes.length ? `${pesos(pendientes.reduce((a, r) => a + valor(r), 0))} en cotizaciones` : "Al día"}</span>
        </div>
        <div className="card kpi">
          <span className="lbl">Rentadas próximas</span>
          <b>{enCurso.length}</b>
          <span className="fine">{pesos(enCurso.reduce((a, r) => a + valor(r), 0))} en precio de referencia</span>
        </div>
        <div className="card kpi">
          <span className="lbl">Contactos en {nombreMes}</span>
          <b>{contactosMes}</b>
          <span className="fine">cotizaciones pedidas por WhatsApp</span>
        </div>
        <div className="card kpi">
          <span className="lbl">Ocupación · 14 días</span>
          <b>{ocupacion} %</b>
          <span className="fine">unidades-día rentadas o bloqueadas</span>
        </div>
      </div>

      {!c.verificada && (
        <p className="note">
          Verifica tu compañía con su NIT y el RUT o el certificado de Cámara de Comercio para mostrar el sello «Verificada» a
          los clientes. Es opcional: mientras tanto ya puedes publicar y recibir solicitudes.{" "}
          <Link href="/tengo/verificacion">Verificar mi compañía</Link>
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

          <section className="bk-list" aria-label="Solicitudes por confirmar">
            <div className="sec-hd">
              <h2>Solicitudes por confirmar</h2>
              <span className="fine">Cotizaciones que te pidieron por WhatsApp; no apartan equipo hasta que las marques como rentadas</span>
            </div>
            {pendientes.length ? (
              pendientes.map((r) => <TarjetaReserva key={r.id} r={r} vista="compania" identidadVerificada={verificados.includes(r.id)} />)
            ) : (
              <p className="vacio">No tienes solicitudes por confirmar.</p>
            )}
          </section>

          <section className="bk-list" aria-label="Rentadas">
            <div className="sec-hd">
              <h2>Rentadas</h2>
              <span className="fine">El equipo queda apartado en tu agenda en esas fechas</span>
            </div>
            {enCurso.length ? (
              enCurso.map((r) => <TarjetaReserva key={r.id} r={r} vista="compania" identidadVerificada={verificados.includes(r.id)} />)
            ) : (
              <p className="vacio">Aún no tienes solicitudes rentadas.</p>
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
              <p className="fine">Aquí verás las solicitudes que no se concretaron o que el cliente canceló.</p>
            )}
          </section>

          <section className="card side-card" aria-labelledby="panel-resenas">
            <div className="sec-hd">
              <h2 id="panel-resenas">Reseñas</h2>
              <span className="fine">
                {resenas.length ? (
                  <>
                    <Estrellas valor={promedio} /> {promedioTexto(promedio)} · {resenas.length}{" "}
                    {resenas.length === 1 ? "reseña" : "reseñas"}
                  </>
                ) : (
                  "Aún no tienes"
                )}
              </span>
            </div>
            <ListaResenas resenas={resenas.slice(0, 5)} compania={c.nombre} puedeResponder />
            <p className="fine">
              Los clientes califican las solicitudes que marcas como rentadas.{" "}
              <Link href={`/compania/${c.id}`}>Ver tu perfil público</Link> (puedes compartir ese enlace).
            </p>
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
