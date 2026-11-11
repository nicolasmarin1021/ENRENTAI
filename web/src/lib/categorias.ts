import { cacheLife } from "next/cache";
import type { Categoria } from "./catalogo";
import { supabaseConfigured } from "./supabase/config";
import { crearClientePublico } from "./supabase/publico";

// Lista de categorías (solo servidor). Es información pública que casi no cambia,
// así que se guarda en caché del servidor y no depende de la sesión de nadie.
export async function getCategorias(): Promise<Categoria[]> {
  "use cache";
  cacheLife("hours");
  if (!supabaseConfigured) return [];
  const { data } = await crearClientePublico().from("categorias").select("id, nombre").order("orden");
  return data ?? [];
}
