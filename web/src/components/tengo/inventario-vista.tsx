import Link from "next/link";
import { BloquearUnidades, QuitarBloqueo } from "@/components/bloqueos";
import { diaSemana, esFinDeSemana, inicioCO, numeroDia, ocupacionDia, sumarDias, type Movimiento } from "@/lib/agenda";
import { fechaCO, pesos, rangoCO } from "@/lib/medellin";

const DIAS = 14;

export type Equipo = {
  id: string;
  nombre: string;
  unidades: number;
  precio_dia: number;
  activo: boolean;
  banda_nombre: string | null;
  banda_min_mhz: number | null;
  banda_max_mhz: number | null;
  equipo_fotos: { id: string }[];
};
export type Reserva = {
  id: string;
  codigo: string;
  estado: string;
  entrega: string;
  recogida: string;
  modalidad: "entrega" | "retiro";
  lugar_nombre: string;
  reserva_items: { equipo_id: string; nombre: string; cantidad: number }[];
};
export type Bloqueo = { id: string; equipo_id: string; cantidad: number; desde: string; hasta: string; motivo: string };

const mhz = (n: number | null) => (n === null ? "" : String(Number(n)).replace(".", ","));

// Inventario y agenda (solo dibuja; los datos los trae la página).
export function InventarioVista({
  equipos,
  reservas,
  bloqueos,
  sinBloqueos,
  desde,
  hoy,
  preBloqueo,
}: {
  equipos: Equipo[];
  reservas: Reserva[];
  bloqueos: Bloqueo[];
  sinBloqueos: boolean;
  desde: string;
  hoy: string;
  preBloqueo: string | null;
}) {
  const dias = Array.from({ length: DIAS }, (_, i) => sumarDias(desde, i));
  const finAgenda = sumarDias(hoy, 21);
  const nombreEq = new Map(equipos.map((e) => [e.id, e.nombre]));

  const movs: Movimiento[] = [
    ...reservas.flatMap((r) =>
      r.reserva_items.map((i) => ({ equipo_id: i.equipo_id, cantidad: i.cantidad, desde: r.entrega, hasta: r.recogida, bloqueo: false })),
    ),
    ...bloqueos.map((b) => ({ equipo_id: b.equipo_id, cantidad: b.cantidad, desde: b.desde, hasta: b.hasta, bloqueo: true })),
  ];

  // Agenda: salidas y regresos de las próximas 3 semanas.
  const eventos = reservas
    .flatMap((r) => [
      { cuando: r.entrega, sale: true, r },
      { cuando: r.recogida, sale: false, r },
    ])
    .filter((x) => x.cuando >= inicioCO(hoy).toISOString() && x.cuando < inicioCO(finAgenda).toISOString())
    .sort((a, b) => a.cuando.localeCompare(b.cuando));

  const anterior = sumarDias(desde, -7);
  return (
    <>
      <div className="row-actions">
        <BloquearUnidades
          key={preBloqueo ?? "nuevo"}
          equipos={equipos.map((e) => ({ id: e.id, nombre: e.nombre, unidades: e.unidades }))}
          inicial={preBloqueo && equipos.some((e) => e.id === preBloqueo) ? preBloqueo : null}
          hoy={hoy}
        />
        <Link href="/tengo/inventario/nuevo" className="btn primary">Publicar equipo</Link>
      </div>
      {sinBloqueos && (
        <p className="fine">Para bloquear unidades falta ejecutar el SQL 0005_bloqueos.sql en Supabase.</p>
      )}

      <section aria-label="Stock por día" className="seccion">
        <div className="sec-hd">
          <h2>Stock por día</h2>
          <div className="row-actions">
            <Link
              href={`/tengo/inventario?desde=${anterior}`}
              className={`btn sm icono ${desde <= hoy ? "deshabilitado" : ""}`}
              aria-label="Semana anterior"
              aria-disabled={desde <= hoy}
            >
              ‹
            </Link>
            <Link href="/tengo/inventario" className={`btn sm ${desde === hoy ? "deshabilitado" : ""}`} aria-disabled={desde === hoy}>
              Hoy
            </Link>
            <Link href={`/tengo/inventario?desde=${sumarDias(desde, 7)}`} className="btn sm icono" aria-label="Semana siguiente">
              ›
            </Link>
          </div>
        </div>

        {equipos.length === 0 ? (
          <div className="empty">
            <h2>Publica tu primer equipo</h2>
            <p className="muted">
              Agrega marca y modelo, cuántas unidades tienes, el precio por 24 horas y fotos reales del equipo y su estuche.
            </p>
            <Link href="/tengo/inventario/nuevo" className="btn primary lg">+ Publicar equipo</Link>
          </div>
        ) : (
          <div className="card grid-wrap">
            <table className="stock">
              <thead>
                <tr>
                  <th scope="col" className="eq-col">Equipo</th>
                  {dias.map((d) => (
                    <th key={d} scope="col" className={`${esFinDeSemana(d) ? "wk" : ""} ${d === hoy ? "is-today" : ""}`}>
                      {diaSemana(d)}
                      <br />
                      {numeroDia(d)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {equipos.map((e) => (
                  <tr key={e.id}>
                    <th scope="row" className="eq-col">
                      <div className="eq-name">{e.nombre}</div>
                      <div className="eq-sub">
                        <b>
                          {e.unidades} u · {pesos(e.precio_dia)}/día
                        </b>
                        {e.banda_nombre && (
                          <span>
                            {e.banda_nombre}
                            {e.banda_min_mhz !== null && e.banda_max_mhz !== null
                              ? ` · ${mhz(e.banda_min_mhz)}–${mhz(e.banda_max_mhz)} MHz`
                              : ""}
                          </span>
                        )}
                        {!e.activo && <span className="tag sm">Pausado</span>}
                        {e.equipo_fotos.length === 0 && <span className="tag warn sm">Sin fotos</span>}
                      </div>
                      <div className="eq-acciones">
                        <Link href={`/tengo/inventario/${e.id}`} className="link-btn">Editar</Link>
                        <Link href={`/tengo/inventario?bloquear=${e.id}#bloquear`} className="link-btn">Bloquear unidades</Link>
                      </div>
                    </th>
                    {dias.map((d) => {
                      const o = ocupacionDia(movs, e.id, d);
                      const usadas = Math.min(e.unidades, o.usadas + o.bloqueadas);
                      const libres = e.unidades - usadas;
                      const r = e.unidades ? usadas / e.unidades : 0;
                      const nivel = r <= 0 ? "" : r <= 0.5 ? "lv1" : r < 1 ? "lv2" : "lv3";
                      return (
                        <td key={d}>
                          <div
                            className={`cell ${nivel} ${o.bloqueadas ? "blk" : ""}`}
                            title={`${d}: ${o.usadas} reservadas${o.bloqueadas ? `, ${o.bloqueadas} bloqueadas` : ""}, ${libres} libres de ${e.unidades}`}
                          >
                            {libres}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="stock-legend">
          <span><i className="sw" />Todo libre</span>
          <span><i className="sw lv1" />Hasta la mitad ocupada</span>
          <span><i className="sw lv2" />Más de la mitad</span>
          <span><i className="sw lv3" />Sin unidades libres</span>
          <span><i className="sw blk" />Con bloqueo</span>
          <span>El número es lo que queda libre.</span>
        </div>
      </section>

      {bloqueos.length > 0 && (
        <section className="seccion" aria-label="Bloqueos activos">
          <div className="sec-hd">
            <h2>Bloqueos activos</h2>
          </div>
          <div className="card side-card">
            <ul className="mini-list">
              {bloqueos.map((b) => (
                <li key={b.id}>
                  <span>
                    <b>
                      {b.cantidad} × {nombreEq.get(b.equipo_id) ?? "Equipo"}
                    </b>{" "}
                    · {b.motivo}
                    <span className="fine bloque">{rangoCO(b.desde, b.hasta)}</span>
                  </span>
                  <QuitarBloqueo id={b.id} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="seccion" aria-label="Agenda">
        <div className="sec-hd">
          <h2>Agenda de salidas y regresos</h2>
          <span className="fine">Próximas 3 semanas</span>
        </div>
        {eventos.length ? (
          <div className="card grid-wrap agenda">
            <table>
              <thead>
                <tr>
                  <th scope="col">Cuándo</th>
                  <th scope="col">Movimiento</th>
                  <th scope="col">Reserva</th>
                  <th scope="col">Equipos</th>
                  <th scope="col">Dónde</th>
                </tr>
              </thead>
              <tbody>
                {eventos.map(({ cuando, sale, r }) => (
                  <tr key={r.id + (sale ? "s" : "r")}>
                    <td className="when">{fechaCO(cuando)}</td>
                    <td>
                      <span className={`dir ${sale ? "out" : "in"}`}>
                        {sale ? (r.modalidad === "entrega" ? "Sale a entrega" : "Lo retiran") : r.modalidad === "entrega" ? "Recogida" : "Lo devuelven"}
                      </span>
                    </td>
                    <td>
                      <Link href={`/reservas/${r.id}?de=tengo`} className="code">{r.codigo}</Link>{" "}
                      {r.estado === "pendiente" && <span className="tag warn sm">Por confirmar</span>}
                    </td>
                    <td>{r.reserva_items.map((i) => `${i.cantidad}× ${i.nombre}`).join(", ")}</td>
                    <td>{r.modalidad === "entrega" ? r.lugar_nombre : "Tu bodega"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="vacio">No hay entregas ni devoluciones en las próximas tres semanas.</p>
        )}
      </section>
    </>
  );
}
