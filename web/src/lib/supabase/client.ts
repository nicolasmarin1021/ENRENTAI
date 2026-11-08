import { createBrowserClient } from "@supabase/ssr";
import { supabaseKey, supabaseUrl } from "./config";

// Cliente para componentes que corren en el navegador ("use client").
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseKey);
}
