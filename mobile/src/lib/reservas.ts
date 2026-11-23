import { useEffect, useState } from "react";
import { aISO, leerLocal } from "./formato";
import { supabase, supabaseConfigurado } from "./supabase";

// Solicitudes (tabla "reservas"): en la BETA el cliente pide cotización por WhatsApp y la
// compañía la marca como rentada o no concretada. Igual que web/src/components/tarjeta-reserva.tsx.

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
  nota: string | null;
  motivo_rechazo: string | null;
  cliente_nombre: string;
  compania_id: string;
  creado: string;
  companias: { nombre: string; zona: string | null; direccion_bodega: string | null; horario_bodega: string | null } | null;
  reserva_items: { equipo_id: string; nombre: string; cantidad: number; precio_dia: number }[];
};

export const SELECT_RESERVA =
  "id, codigo, estado, entrega, recogida, dias, modalidad, lugar_nombre, lugar_direccion, distancia_km, con_tecnico, " +
  "alquiler, transporte, tecnico, nota, motivo_rechazo, cliente_nombre, compania_id, creado, " +
  "companias(nombre, zona, direccion_bodega, horario_bodega), reserva_items(equipo_id, nombre, cantidad, precio_dia)";

// Precio de referencia de la BETA: alquiler + transporte + técnico.
export const referencia = (r: Pick<ReservaFila, "alquiler" | "transporte" | "tecnico">) =>
  Number(r.alquiler) + Number(r.transporte) + Number(r.tecnico);

export type Tono = "" | "ok" | "aviso" | "acento";
export const ESTADOS_RESERVA: Record<string, { texto: string; tono: Tono }> = {
  pendiente: { texto: "Por confirmar", tono: "aviso" },
  confirmada: { texto: "Rentada", tono: "acento" },
  rechazada: { texto: "No se concretó", tono: "" },
  cancelada: { texto: "Cancelada", tono: "" },
  en_curso: { texto: "Equipo en el show", tono: "ok" },
  completada: { texto: "Completada", tono: "" },
};

export const RENTADA = ["confirmada", "en_curso", "completada"];
const ACTIVAS = ["pendiente", "confirmada", "en_curso"];
// Activa: por confirmar o rentada y todavía no ha pasado la recogida.
export const esActiva = (r: ReservaFila, ahora: number) => ACTIVAS.includes(r.estado) && Date.parse(r.recogida) >= ahora;

// Unidades ya apartadas por otras reservas en las fechas del pedido, por equipo.
// Si la función aún no existe en la base de datos, se asume que todo está libre.
export function useOcupadas(entrega: string, recogida: string, version = 0) {
  // Solo con fechas válidas (un pedido guardado con fechas dañadas no debe cerrar la app).
  const clave = leerLocal(entrega) && leerLocal(recogida) ? `${entrega}|${recogida}|${version}` : "";
  const [estado, setEstado] = useState<{ clave: string; mapa: Record<string, number> }>({ clave: "", mapa: {} });

  useEffect(() => {
    if (!clave || !supabaseConfigurado) return;
    let vivo = true;
    supabase.rpc("unidades_ocupadas", { p_desde: aISO(entrega), p_hasta: aISO(recogida) }).then(({ data, error }) => {
      if (!vivo) return;
      const mapa: Record<string, number> = {};
      if (!error && Array.isArray(data))
        for (const f of data as { equipo_id: string; ocupadas: number }[]) mapa[f.equipo_id] = Number(f.ocupadas);
      setEstado({ clave, mapa });
    });
    return () => {
      vivo = false;
    };
  }, [clave, entrega, recogida]);

  return estado.clave === clave ? estado.mapa : {};
}
