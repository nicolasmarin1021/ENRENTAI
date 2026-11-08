import { connection } from "next/server";
import { cache } from "react";
import { supabaseConfigured } from "./supabase/config";
import { createClient } from "./supabase/server";

export type Sesion = {
  id: string;
  correo: string;
  nombre: string;
  admin: boolean;
  compania: { id: string; nombre: string; verificada: boolean } | null;
};

// Lee la sesión de la petición actual (solo en el servidor).
// Quien la use debe estar dentro de un <Suspense>, porque lee cookies.
// `cache` evita repetir la consulta si varios componentes la piden en la misma petición.
export const getSesion = cache(async (): Promise<Sesion | null> => {
  if (!supabaseConfigured) return null;
  // Supabase mira la hora para saber si la sesión venció. Next no deja leer la hora
  // mientras prepara páginas por adelantado, así que la sesión se lee solo al momento
  // de la visita.
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  const [{ data: perfil }, { data: compania }] = await Promise.all([
    supabase.from("perfiles").select("nombre, es_admin").eq("id", claims.sub).maybeSingle(),
    supabase
      .from("companias")
      .select("id, nombre, verificada")
      .eq("duenio", claims.sub)
      .order("creado")
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    id: claims.sub,
    correo: typeof claims.email === "string" ? claims.email : "",
    nombre: perfil?.nombre ?? "",
    admin: perfil?.es_admin === true,
    compania: compania ?? null,
  };
});

export function iniciales(texto: string) {
  const partes = texto.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "?";
  return (partes[0][0] + (partes[1]?.[0] ?? "")).toUpperCase();
}
