import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseKey, supabaseUrl } from "./config";

// Cliente para el servidor (componentes de servidor, acciones y rutas).
// Se crea uno nuevo en cada petición. Como lee cookies, quien lo use debe ir
// dentro de un <Suspense> (requisito de Cache Components en Next 16).
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Los componentes de servidor no pueden escribir cookies;
          // el proxy (src/proxy.ts) se encarga de renovar la sesión.
        }
      },
    },
  });
}
