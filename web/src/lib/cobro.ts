// Cálculo del cobro de una reserva (igual al de la base de datos, 0003_reservas.sql).
// Aquí solo se usa para mostrarlo; el valor que vale es el que calcula Supabase.
import { costoTransporte, distanciaKm, type Punto, type Transporte } from "./geo";

export const SERVICIO = 0.07; // lo paga el cliente
export const COMISION = 0.1; // se descuenta a la compañía

export type CompaniaCobro = Transporte &
  Punto & { deposito_pct: number; tecnico_tarifa_dia: number | null };

export function calcularCobro(
  c: CompaniaCobro,
  items: { precio_dia: number; cantidad: number }[],
  dias: number,
  lugar: Punto,
  modalidad: "entrega" | "retiro",
  tecnico: boolean,
) {
  const alquiler = items.reduce((a, i) => a + i.precio_dia * i.cantidad * dias, 0);
  const km = distanciaKm(c, lugar);
  const costoEntrega = costoTransporte(c, km);
  const transporte = modalidad === "entrega" ? costoEntrega ?? 0 : 0;
  const tecnicoValor = tecnico && c.tecnico_tarifa_dia ? c.tecnico_tarifa_dia * dias : 0;
  const base = alquiler + transporte + tecnicoValor;
  const servicio = Math.round(base * SERVICIO);
  const deposito = Math.round((alquiler * c.deposito_pct) / 100);
  return {
    alquiler,
    transporte,
    tecnico: tecnicoValor,
    base,
    servicio,
    deposito,
    total: base + servicio + deposito,
    km,
    puedeEntregar: costoEntrega !== null,
  };
}

export const ESTADOS_RESERVA: Record<string, { texto: string; tono: "" | "ok" | "warn" }> = {
  pendiente: { texto: "Esperando respuesta", tono: "warn" },
  confirmada: { texto: "Confirmada", tono: "ok" },
  rechazada: { texto: "Rechazada", tono: "" },
  cancelada: { texto: "Cancelada", tono: "" },
  en_curso: { texto: "En curso", tono: "ok" },
  completada: { texto: "Completada", tono: "" },
};
