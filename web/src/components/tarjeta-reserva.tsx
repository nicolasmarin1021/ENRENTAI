import { ESTADOS_RESERVA } from "@/lib/cobro";
import { fechaCO, pesos, rangoCO } from "@/lib/medellin";
import { CancelarReserva, ResponderReserva } from "./acciones-reserva";
import { BotonPDF } from "./boton-pdf";
import { BotonPreguntar } from "./boton-preguntar";
import { CalificarCompania } from "./resenas";

export type ReservaFila = {
  id: string;
  codigo: string;
  estado: string;
  entrega: string;
  recogida: string;
  dias: number;
  modalidad: "entrega" | "retiro";
  lugar_nombre: string;
  lugar_direccion: string | null;
  distancia_km: number | null;
  con_tecnico: boolean;
  alquiler: number;
  transporte: number;
  tecnico: number;
  servicio: number;
  deposito_pct: number;
  deposito: number;
  comision: number;
  total: number;
  nota: string | null;
  motivo_rechazo: string | null;
  cliente_nombre: string;
  compania_id: string;
  creado: string;
  actualizado?: string;
  companias: { nombre: string; zona: string | null; direccion_bodega: string | null; horario_bodega: string | null } | null;
  reserva_items: { equipo_id: string; nombre: string; cantidad: number; precio_dia: number }[];
  lugar_lat?: number | null;
  lugar_lng?: number | null;
};

export const SELECT_RESERVA =
  "id, codigo, estado, entrega, recogida, dias, modalidad, lugar_nombre, lugar_direccion, distancia_km, con_tecnico, " +
  "lugar_lat, lugar_lng, alquiler, transporte, tecnico, servicio, deposito_pct, deposito, comision, total, nota, motivo_rechazo, cliente_nombre, compania_id, creado, actualizado, " +
  "companias(nombre, zona, direccion_bodega, horario_bodega), reserva_items(equipo_id, nombre, cantidad, precio_dia)";

const km = (n: number | null) => (n === null ? null : `${String(Math.round(Number(n) * 10) / 10).replace(".", ",")} km`);

// Una solicitud vista por el cliente o por la compañía (BETA: precio de referencia, sin cobros de ENRENTA).
export function TarjetaReserva({
  r,
  vista,
  resena = null,
  identidadVerificada = false,
}: {
  r: ReservaFila;
  vista: "cliente" | "compania";
  resena?: { estrellas: number; comentario: string | null } | null; // la reseña del cliente, si ya calificó
  identidadVerificada?: boolean; // un admin revisó la cédula de quien pidió (SQL 0012)
}) {
  const est = ESTADOS_RESERVA[r.estado] ?? { texto: r.estado, tono: "" };
  const referencia = r.alquiler + r.transporte + r.tecnico;
  const futura = new Date(r.entrega) > new Date();
  // Se califica una solicitud rentada desde su fecha de entrega.
  const puedeCalificar = vista === "cliente" && !futura && ["confirmada", "en_curso", "completada"].includes(r.estado);
  const logistica =
    (r.modalidad === "entrega"
      ? `Entrega en ${r.lugar_nombre} ${fechaCO(r.entrega)} · recogida ${fechaCO(r.recogida)}`
      : `Retiro en bodega${r.companias?.direccion_bodega ? ` (${r.companias.direccion_bodega})` : ""} ${fechaCO(r.entrega)} · devolución ${fechaCO(r.recogida)}`) +
    (r.con_tecnico ? " · con técnico" : "");

  return (
    <article className="card bk">
      <header className="bk-hd">
        <span className="code">{r.codigo}</span>
        <span className={`tag ${est.tono}`}>{est.texto}</span>
        <span className="bk-when">
          {rangoCO(r.entrega, r.recogida)} · {r.dias} {r.dias === 1 ? "día" : "días"}
        </span>
      </header>

      <div className="bk-body">
        <div className="bk-col">
          {vista === "compania" ? (
            <>
              <span className="lbl">Cliente</span>
              <b>{r.cliente_nombre || "Cliente"}</b>
              {identidadVerificada && <span className="ok-txt fine">✓ Identidad verificada</span>}
              {r.distancia_km !== null && <span className="fine">a {km(r.distancia_km)} de tu bodega</span>}
            </>
          ) : (
            <>
              <span className="lbl">Compañía</span>
              <b>{r.companias?.nombre}</b>
              {r.companias?.zona && <span className="fine">{r.companias.zona}</span>}
            </>
          )}
          <span className="lbl mt">Show</span>
          <b>{r.lugar_nombre}</b>
        </div>
        <div className="bk-col">
          <span className="lbl">Equipos</span>
          <ul className="bk-items">
            {r.reserva_items.map((i, k) => (
              <li key={k}>
                <span className="cant">{i.cantidad}×</span>
                {i.nombre}
              </li>
            ))}
          </ul>
          <p className="fine logi">{logistica}</p>
        </div>
        <div className="bk-amt">
          <span className="lbl">Precio de referencia</span>
          <b>{pesos(referencia)}</b>
          <span className="fine">
            {vista === "compania" ? "Sin comisión de ENRENTA en la BETA" : "El valor final lo acuerdas con la compañía"}
          </span>
        </div>
      </div>

      {r.nota && <p className="bk-note">“{r.nota}”</p>}
      {r.estado === "rechazada" && r.motivo_rechazo && <p className="bk-note">No se concretó: {r.motivo_rechazo}</p>}
      <footer className="bk-ft">
        <details>
          <summary>Detalle de la cotización</summary>
          <dl className="cobro mini">
            <div><dt>Alquiler ({r.dias} {r.dias === 1 ? "día" : "días"})</dt><dd>{pesos(r.alquiler)}</dd></div>
            <div><dt>Transporte</dt><dd>{r.modalidad === "retiro" ? "Retiro en bodega" : pesos(r.transporte)}</dd></div>
            {r.tecnico > 0 && <div><dt>Técnico</dt><dd>{pesos(r.tecnico)}</dd></div>}
            <div className="total"><dt>Total de referencia</dt><dd>{pesos(referencia)}</dd></div>
          </dl>
          <p className="fine">
            Precio de referencia: el valor final se acuerda directamente con la compañía. Solicitud enviada{" "}
            {fechaCO(r.creado)}.
          </p>
        </details>
        <div className="bk-actions">
          {puedeCalificar && (
            <CalificarCompania reservaId={r.id} compania={r.companias?.nombre ?? "la compañía"} inicial={resena} />
          )}
          {vista === "compania" && r.estado === "pendiente" && <ResponderReserva id={r.id} />}
          {(
            <BotonPDF
              texto="Cotización PDF"
              datos={{
                tipo: "cotizacion",
                numero: r.codigo,
                cliente: { nombre: r.cliente_nombre },
                compania: {
                  nombre: r.companias?.nombre ?? "",
                  zona: r.companias?.zona,
                  direccionBodega: r.companias?.direccion_bodega,
                  horario: r.companias?.horario_bodega,
                },
                evento: {
                  lugar: r.lugar_nombre,
                  direccion: r.lugar_direccion,
                  entrega: r.entrega,
                  recogida: r.recogida,
                  dias: r.dias,
                  modalidad: r.modalidad,
                  distanciaKm: r.distancia_km === null ? null : Number(r.distancia_km),
                },
                items: r.reserva_items.map((i) => ({ nombre: i.nombre, cantidad: i.cantidad, precioDia: i.precio_dia })),
                tecnico: r.con_tecnico ? { nombre: "Técnico", valor: r.tecnico } : null,
                cobro: {
                  alquiler: r.alquiler,
                  transporte: r.transporte,
                  tecnico: r.tecnico,
                  servicio: 0,
                  depositoPct: 0,
                  deposito: 0,
                  total: referencia,
                },
              }}
            />
          )}
          {vista === "cliente" && futura && (r.estado === "pendiente" || r.estado === "confirmada") && (
            <CancelarReserva id={r.id} />
          )}
          {vista === "cliente" && ["pendiente", "confirmada"].includes(r.estado) && (
            <BotonPreguntar companiaId={r.compania_id} className="btn primary" texto={`Hola, te escribo por la solicitud ${r.codigo}: `}>
              Conversar con proveedor
            </BotonPreguntar>
          )}
        </div>
      </footer>
    </article>
  );
}
