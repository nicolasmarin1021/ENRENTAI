import { useEffect, useState } from "react";
import type { Calificacion, ResumenCalificacion } from "./calificaciones";
import { supabase, supabaseUrl } from "./supabase";

// Perfil del cliente (supabase/migrations/0010_perfil_cliente.sql): lo que ve una compañía de
// quien le pide equipo, para saber a quién le renta.

export type PerfilCliente = {
  nombre: string;
  ocupacion: string | null;
  empresa: string | null;
  descripcion: string | null;
  ciudad: string;
  enlace: string | null;
  foto: string | null; // ruta en el bucket "avatares"
  miembro_desde?: string;
  rentas?: number;
  // Con el SQL 0011: lo que dicen de esta persona las compañías a las que les ha rentado.
  calificacion?: ResumenCalificacion | null;
  calificaciones?: Calificacion[];
};

export const OCUPACIONES = [
  "Ingeniero/a de sonido",
  "Productor/a",
  "Técnico/a RF",
  "Músico / artista",
  "Empresa de eventos",
  "Organizador/a",
  "Otro",
];

export const MAX_DESCRIPCION = 300;

// URL pública de una foto de perfil.
export const urlAvatar = (ruta: string) =>
  `${supabaseUrl}/storage/v1/object/public/avatares/${ruta.split("/").map(encodeURIComponent).join("/")}`;

// Qué tan completo está el perfil (0 a 100): ayuda a que la persona lo termine.
export function completitud(p: Pick<PerfilCliente, "nombre" | "ocupacion" | "empresa" | "descripcion" | "foto" | "enlace">) {
  const partes = [p.nombre?.trim(), p.ocupacion, p.empresa?.trim(), p.descripcion?.trim(), p.foto, p.enlace?.trim()];
  return Math.round((partes.filter(Boolean).length / partes.length) * 100);
}

// "instagram.com/ana" o "@ana" → enlace que se puede abrir.
export function enlaceAbrible(v: string) {
  const t = v.trim();
  if (!t) return "";
  if (/^@[\w.]+$/.test(t)) return `https://instagram.com/${t.slice(1)}`;
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

// Texto corto del enlace para mostrar: "instagram.com/ana".
export const enlaceCorto = (v: string) => enlaceAbrible(v).replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");

const CAMPOS = "nombre, ocupacion, empresa, descripcion, ciudad, enlace, foto, creado";

// Mi perfil (si falta el SQL 0010, devuelve solo lo básico y avisa con faltaSql).
export async function leerMiPerfil(uid: string): Promise<{ perfil: PerfilCliente; faltaSql: boolean }> {
  const { data, error } = await supabase.from("perfiles").select(CAMPOS).eq("id", uid).maybeSingle();
  if (error?.code === "42703") {
    const { data: basico } = await supabase.from("perfiles").select("nombre, ciudad, creado").eq("id", uid).maybeSingle();
    const b = basico as { nombre: string; ciudad: string; creado: string } | null;
    return {
      faltaSql: true,
      perfil: { nombre: b?.nombre ?? "", ciudad: b?.ciudad ?? "Medellín", ocupacion: null, empresa: null, descripcion: null, enlace: null, foto: null, miembro_desde: b?.creado },
    };
  }
  const d = data as (Omit<PerfilCliente, "miembro_desde"> & { creado: string }) | null;
  return {
    faltaSql: false,
    perfil: {
      nombre: d?.nombre ?? "",
      ocupacion: d?.ocupacion ?? null,
      empresa: d?.empresa ?? null,
      descripcion: d?.descripcion ?? null,
      ciudad: d?.ciudad ?? "Medellín",
      enlace: d?.enlace ?? null,
      foto: d?.foto ?? null,
      miembro_desde: d?.creado,
    },
  };
}

// El perfil de quien hizo una solicitud (para la compañía).
export async function perfilDeSolicitud(reservaId: string): Promise<PerfilCliente | null> {
  const { data, error } = await supabase.rpc("perfil_de_solicitud", { p_reserva: reservaId });
  if (error || !data) return null;
  return data as PerfilCliente;
}

// Perfiles de quienes hicieron las solicitudes que se ven en el panel de la compañía (las vigentes
// y las rentadas que terminaron hace poco, para calificarlas), por id de solicitud. Se vuelven a
// pedir solo si cambia la lista (o version, después de calificar).
export const DIAS_PARA_CALIFICAR = 60;
export function usePerfilesDeSolicitudes(reservas: { id: string; estado: string; recogida: string }[], ahora: number, version = 0) {
  const limite = ahora - DIAS_PARA_CALIFICAR * 86400000;
  const ids = reservas
    .filter((r) =>
      r.estado === "pendiente"
        ? Date.parse(r.recogida) >= ahora
        : ["confirmada", "en_curso", "completada"].includes(r.estado) && Date.parse(r.recogida) >= limite,
    )
    .map((r) => r.id)
    .join(",");
  const clave = ids ? `${ids}|${version}` : "";
  const [mapa, setMapa] = useState<Record<string, PerfilCliente>>({});

  useEffect(() => {
    if (!clave) return;
    let vivo = true;
    const lista = clave.split("|")[0].split(",");
    void Promise.all(lista.map((id) => perfilDeSolicitud(id).then((p) => [id, p] as const))).then((pares) => {
      if (!vivo) return;
      const m: Record<string, PerfilCliente> = {};
      for (const [id, p] of pares) if (p) m[id] = p;
      setMapa(m);
    });
    return () => {
      vivo = false;
    };
  }, [clave]);

  return mapa;
}

// "Trabaja en Producciones Andes · Ingeniero/a de sonido" (o lo que tenga).
export function lineaTrabajo(p: PerfilCliente | null | undefined) {
  if (!p) return "";
  if (p.empresa) return `Trabaja en ${p.empresa}${p.ocupacion ? ` · ${p.ocupacion}` : ""}`;
  return p.ocupacion ?? "";
}
