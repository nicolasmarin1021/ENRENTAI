import { useEffect, useState } from "react";
import { supabase } from "./supabase";

// Calificaciones de las compañías a los clientes (supabase/migrations/0011_calificar_clientes.sql).

export type Problema = "dano" | "faltante" | "retraso" | "pago" | "trato" | "otro";

export const PROBLEMAS: { id: Problema; texto: string }[] = [
  { id: "dano", texto: "Daño al equipo" },
  { id: "faltante", texto: "Faltó equipo o accesorios" },
  { id: "retraso", texto: "Devolución tarde" },
  { id: "pago", texto: "Problema con el pago" },
  { id: "trato", texto: "Mal trato" },
  { id: "otro", texto: "Otro" },
];
export const textoProblema = (id: string | null | undefined) => PROBLEMAS.find((p) => p.id === id)?.texto ?? "Problema";

export type Calificacion = {
  id?: string;
  compania?: string;
  compania_nombre?: string;
  estrellas: number;
  comentario: string | null;
  problema: Problema | null;
  respuesta: string | null;
  creado: string;
};

export type ResumenCalificacion = { promedio: number | null; total: number; problemas: number };

// La calificación que la compañía ya le dejó a una solicitud (o null).
export async function miCalificacionDe(reservaId: string): Promise<Calificacion | null> {
  const { data } = await supabase
    .from("calificaciones_cliente")
    .select("id, estrellas, comentario, problema, respuesta, creado")
    .eq("reserva_id", reservaId)
    .maybeSingle();
  return (data as Calificacion | null) ?? null;
}

// Las calificaciones que las compañías le dejaron al cliente (para su perfil).
export async function calificacionesRecibidas(uid: string): Promise<{ lista: Calificacion[]; faltaSql: boolean }> {
  const { data, error } = await supabase
    .from("calificaciones_cliente")
    .select("id, compania_nombre, estrellas, comentario, problema, respuesta, creado")
    .eq("cliente", uid)
    .order("creado", { ascending: false });
  return { lista: (data ?? []) as Calificacion[], faltaSql: error?.code === "PGRST205" || error?.code === "42P01" };
}

// Ids de las solicitudes que la compañía ya calificó (para marcar "Por calificar" en su panel).
// null = todavía no se ejecutó el SQL 0011 (o no se pudo leer): no se marca nada.
export async function solicitudesCalificadas(cid: string): Promise<string[] | null> {
  const { data, error } = await supabase.from("calificaciones_cliente").select("reserva_id").eq("compania_id", cid);
  if (error) return null;
  return ((data ?? []) as { reserva_id: string }[]).map((x) => x.reserva_id);
}

// Las solicitudes ya calificadas por la compañía, con recarga (después de calificar).
export function useCalificadas(cid: string) {
  const [version, setVersion] = useState(0);
  const [ids, setIds] = useState<string[] | null>(null);
  useEffect(() => {
    let vivo = true;
    void solicitudesCalificadas(cid).then((x) => {
      if (vivo) setIds(x);
    });
    return () => {
      vivo = false;
    };
  }, [cid, version]);
  return { calificadas: ids, recargarCalificadas: () => setVersion((v) => v + 1) };
}

// "★ 4,6 · 3 calificaciones" para mostrar junto al nombre.
export const promedioTexto = (n: number | null | undefined) => (n == null ? "" : String(Math.round(n * 10) / 10).replace(".", ","));
