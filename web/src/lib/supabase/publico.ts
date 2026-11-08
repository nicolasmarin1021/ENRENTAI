import { createClient } from "@supabase/supabase-js";
import { supabaseKey, supabaseUrl } from "./config";

// Cliente sin sesión para leer información pública (catálogo, categorías, lugares).
// No lee cookies, así que sirve dentro de "use cache" y no depende de quién visita.
export function crearClientePublico() {
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
