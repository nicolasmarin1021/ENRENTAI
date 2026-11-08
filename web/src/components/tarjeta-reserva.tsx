import Link from "next/link";
import { ESTADOS_RESERVA } from "@/lib/cobro";
import { fechaCO, pesos } from "@/lib/medellin";
import { CancelarReserva, ResponderReserva } from "./acciones-reserva";

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
  companias: { nombre: string; zona: string | null; direccion_bodega: string | null; horario_bodega: string | null } | null;
  reserva_items: { nombre: string; cantidad: number; precio_dia: number }[];
};

export const SELECT_RESERVA =
  "id, codigo, estado, entrega, recogida, dias, modalidad, lugar_nombre, lugar_direccion, distancia_km, con_tecnico, " +
  "alquiler, transporte, tecnico, servicio, deposito_pct, deposito, comision, total, nota, motivo_rechazo, cliente_nombre, creado, " +
  "companias(nombre, zona, direccion_bodega, horario_bodega), reserva_items(nombre, cantidad, precio_dia)";

// Una reserva vista por el cliente o por la compañía.
export function TarjetaReserva({
  r,
  vista,
  enlace = true,
}: {
  r: ReservaFila;
  vista: "cliente" | "compania";
  enlace?: boolean; // muestra el enlace a "Entregas y casos"
}) {
  const est = ESTADOS_RESERVA[r.estado] ?? { texto: r.estado, tono: "" };
  const base = r.alquiler + r.transporte + r.tecnico;
  const futura = new Date(r.entrega) > new Date();

  return (
    <article className="card reserva">
      <header className="ventana-hd">
        <div>
          <span className="fine">
            {r.codigo} · {vista === "cliente" ? r.companias?.nombre : r.cliente_nombre || "Cliente"}
          </span>
          <h2>
            {fechaCO(r.entrega)} → {fechaCO(r.recogida)}
          </h2>
        </div>
        <span className={`tag ${est.tono}`}>{est.texto}</span>
      </header>

      <dl className="dl">
        <div>
          <dt>Show</dt>
          <dd>
            {r.lugar_nombre}
            {r.lugar_direccion ? ` · ${r.lugar_direccion}` : ""}
          </dd>
        </div>
        <div>
          <dt>{r.modalidad === "entrega" ? "Entrega en el lugar" : "Recoge en la bodega"}</dt>
          <dd>
            {r.modalidad === "entrega"
              ? `${r.distancia_km !== null ? `${String(Number(r.distancia_km)).replace(".", ",")} km · ` : ""}${pesos(r.transporte)}`
              : vista === "cliente"
                ? `${r.companias?.direccion_bodega ?? "Dirección por confirmar"}${r.companias?.horario_bodega ? ` · ${r.companias.horario_bodega}` : ""}`
                : "El cliente recoge y devuelve en tu bodega"}
          </dd>
        </div>
      </dl>

      <ul className="lista-items">
        {r.reserva_items.map((i, k) => (
          <li key={k}>
            <span>
              {i.cantidad} × {i.nombre}
            </span>
            <span className="fine">{pesos(i.precio_dia * i.cantidad * r.dias)}</span>
          </li>
        ))}
        {r.con_tecnico && (
          <li>
            <span>Técnico</span>
            <span className="fine">{pesos(r.tecnico)}</span>
          </li>
        )}
      </ul>

      {r.nota && (
        <p className="note">
          <b>Nota del cliente:</b> {r.nota}
        </p>
      )}
      {r.estado === "rechazada" && r.motivo_rechazo && (
        <p className="note">
          <b>Motivo del rechazo:</b> {r.motivo_rechazo}
        </p>
      )}

      {vista === "cliente" ? (
        <dl className="cobro">
          <div><dt>Alquiler ({r.dias} {r.dias === 1 ? "día" : "días"}) + transporte + técnico</dt><dd>{pesos(base)}</dd></div>
          <div><dt>Tarifa de servicio ENRENTA</dt><dd>{pesos(r.servicio)}</dd></div>
          <div><dt>Depósito reembolsable ({Number(r.deposito_pct)} %)</dt><dd>{pesos(r.deposito)}</dd></div>
          <div className="total"><dt>Total</dt><dd>{pesos(r.total)}</dd></div>
        </dl>
      ) : (
        <dl className="cobro">
          <div><dt>Alquiler, transporte y técnico</dt><dd>{pesos(base)}</dd></div>
          <div><dt>Comisión ENRENTA (10 %)</dt><dd>− {pesos(r.comision)}</dd></div>
          <div className="total"><dt>Recibes</dt><dd>{pesos(base - r.comision)}</dd></div>
          <div><dt>Depósito del cliente (en garantía)</dt><dd>{pesos(r.deposito)}</dd></div>
        </dl>
      )}

      {enlace && ["confirmada", "en_curso", "completada"].includes(r.estado) && (
        <Link href={`/reservas/${r.id}`} className="btn primary" style={{ justifySelf: "start" }}>
          Entregas y casos →
        </Link>
      )}
      {vista === "compania" && r.estado === "pendiente" && <ResponderReserva id={r.id} />}
      {vista === "cliente" && futura && (r.estado === "pendiente" || r.estado === "confirmada") && (
        <CancelarReserva id={r.id} />
      )}
    </article>
  );
}
