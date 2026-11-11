import Link from "next/link";
import { ESTADOS_RESERVA } from "@/lib/cobro";
import { fechaCO, pesos, rangoCO } from "@/lib/medellin";
import { CancelarReserva, ResponderReserva } from "./acciones-reserva";
import { BotonPDF } from "./boton-pdf";

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
  creado: string;
  actualizado?: string;
  companias: { nombre: string; zona: string | null; direccion_bodega: string | null; horario_bodega: string | null } | null;
  reserva_items: { equipo_id: string; nombre: string; cantidad: number; precio_dia: number }[];
  lugar_lat?: number | null;
  lugar_lng?: number | null;
};

export const SELECT_RESERVA =
  "id, codigo, estado, entrega, recogida, dias, modalidad, lugar_nombre, lugar_direccion, distancia_km, con_tecnico, " +
  "lugar_lat, lugar_lng, alquiler, transporte, tecnico, servicio, deposito_pct, deposito, comision, total, nota, motivo_rechazo, cliente_nombre, creado, actualizado, " +
  "companias(nombre, zona, direccion_bodega, horario_bodega), reserva_items(equipo_id, nombre, cantidad, precio_dia)";

const km = (n: number | null) => (n === null ? null : `${String(Math.round(Number(n) * 10) / 10).replace(".", ",")} km`);

// Una reserva vista por el cliente o por la compañía (la tarjeta del prototipo).
export function TarjetaReserva({
  r,
  vista,
  enlace = true,
}: {
  r: ReservaFila;
  vista: "cliente" | "compania";
  enlace?: boolean; // muestra el acceso a "Entrega y devolución"
}) {
  const est = ESTADOS_RESERVA[r.estado] ?? { texto: r.estado, tono: "" };
  const base = r.alquiler + r.transporte + r.tecnico;
  const futura = new Date(r.entrega) > new Date();
  const activa = ["confirmada", "en_curso", "completada"].includes(r.estado);
  const hrefEntrega = vista === "compania" ? `/reservas/${r.id}?de=tengo` : `/reservas/${r.id}`;
  const hrefChat = vista === "compania" ? `/tengo/mensajes?reserva=${r.id}` : `/necesito/chats?reserva=${r.id}`;
  const logistica =
    (r.modalidad === "entrega"
      ? `Entrega en ${r.lugar_nombre} ${fechaCO(r.entrega)} · recogida ${fechaCO(r.recogida)}`
      : `Retiro en bodega${r.companias?.direccion_bodega ? ` (${r.companias.direccion_bodega})` : ""} ${fechaCO(r.entrega)} · devolución ${fechaCO(r.recogida)}`) +
    (r.con_tecnico ? " · con técnico" : "");
  const textoEntrega =
    vista === "compania"
      ? r.estado === "confirmada"
        ? "Registrar salida con fotos"
        : r.estado === "en_curso"
          ? "Entrega y revisión final"
          : "Ver entrega"
      : r.estado === "en_curso"
        ? "Registrar recepción y devolución"
        : "Entrega y devolución";

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
              <span className="lbl">Arrendatario</span>
              <b>{r.cliente_nombre || "Cliente"}</b>
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
          {vista === "compania" ? (
            <>
              <span className="lbl">Recibes</span>
              <b>{pesos(base - r.comision)}</b>
              <span className="fine">tras comisión de {pesos(r.comision)} (10 %)</span>
            </>
          ) : (
            <>
              <span className="lbl">Total</span>
              <b>{pesos(r.total)}</b>
              <span className="fine">incluye {pesos(r.deposito)} de depósito</span>
            </>
          )}
        </div>
      </div>

      {r.nota && <p className="bk-note">“{r.nota}”</p>}
      {r.estado === "rechazada" && r.motivo_rechazo && <p className="bk-note">Motivo del rechazo: {r.motivo_rechazo}</p>}

      <footer className="bk-ft">
        <details>
          <summary>Detalle del cobro</summary>
          <dl className="cobro mini">
            <div><dt>Alquiler ({r.dias} {r.dias === 1 ? "día" : "días"})</dt><dd>{pesos(r.alquiler)}</dd></div>
            <div><dt>Transporte</dt><dd>{r.modalidad === "retiro" ? "Retiro en bodega" : pesos(r.transporte)}</dd></div>
            {r.tecnico > 0 && <div><dt>Técnico</dt><dd>{pesos(r.tecnico)}</dd></div>}
            {vista === "cliente" ? (
              <>
                <div><dt>Tarifa de servicio (7 %)</dt><dd>{pesos(r.servicio)}</dd></div>
                <div><dt>Depósito reembolsable ({Number(r.deposito_pct)} %)</dt><dd>{pesos(r.deposito)}</dd></div>
                <div className="total"><dt>Total</dt><dd>{pesos(r.total)}</dd></div>
              </>
            ) : (
              <>
                <div><dt>Comisión ENRENTA (10 %)</dt><dd>− {pesos(r.comision)}</dd></div>
                <div className="total"><dt>Recibes</dt><dd>{pesos(base - r.comision)}</dd></div>
              </>
            )}
          </dl>
          <p className="fine">Solicitud enviada {fechaCO(r.creado)}.</p>
        </details>
        <div className="bk-actions">
          {vista === "compania" && r.estado === "pendiente" && <ResponderReserva id={r.id} />}
          {activa && (
            <BotonPDF
              texto={vista === "cliente" ? "Comprobante" : "Liquidación"}
              datos={{
                tipo: vista === "cliente" ? "comprobante" : "liquidacion",
                numero: r.codigo,
                estado: est.texto,
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
                  servicio: r.servicio,
                  depositoPct: Number(r.deposito_pct),
                  deposito: r.deposito,
                  total: r.total,
                  comision: r.comision,
                },
              }}
            />
          )}
          {vista === "cliente" && futura && (r.estado === "pendiente" || r.estado === "confirmada") && (
            <CancelarReserva id={r.id} />
          )}
          <Link href={hrefChat} className="btn">
            {vista === "cliente" ? "Escribir a la compañía" : "Escribir al cliente"}
          </Link>
          {enlace && activa && (
            <Link
              href={hrefEntrega}
              className={`btn ${r.estado === "completada" ? "" : "primary"}`}
            >
              {textoEntrega}
            </Link>
          )}
        </div>
      </footer>
    </article>
  );
}
