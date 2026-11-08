import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseConfigured, supabaseKey, supabaseUrl } from "./config";

// Rutas que exigen haber entrado, y a qué entrada se envía a quien no tiene sesión.
const CON_CUENTA: [string, string][] = [
  ["/tengo/panel", "/tengo"],
  ["/tengo/registro", "/tengo"],
  ["/tengo/inventario", "/tengo"],
  ["/tengo/reservas", "/tengo"],
  ["/necesito/reservas", "/necesito"],
  ["/reservas", "/necesito"],
];

// Renueva la sesión de Supabase en cada petición y devuelve las cookies actualizadas.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!supabaseConfigured) return response;

  // Si Supabase devuelve el enlace del correo a la página de inicio (cuando la ruta
  // de confirmación no está en sus "Redirect URLs"), igual se completa la entrada.
  const codigo = request.nextUrl.searchParams.get("code");
  if (codigo && request.nextUrl.pathname === "/") {
    const confirmar = request.nextUrl.clone();
    confirmar.pathname = "/auth/confirmar";
    confirmar.search = "";
    confirmar.searchParams.set("code", codigo);
    return NextResponse.redirect(confirmar);
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        // Evita que un CDN guarde en caché una respuesta con la sesión de otra persona.
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Valida el token y lo renueva si está por vencer. No poner código entre
  // createServerClient y esta llamada: provoca cierres de sesión difíciles de rastrear.
  const { data } = await supabase.auth.getClaims();

  const ruta = request.nextUrl.pathname;
  const protegida = CON_CUENTA.find(([p]) => ruta === p || ruta.startsWith(p + "/"));
  if (!data?.claims && protegida) {
    const destino = request.nextUrl.clone();
    destino.pathname = protegida[1];
    destino.search = "";
    const redireccion = NextResponse.redirect(destino);
    // Conserva las cookies que Supabase haya actualizado en esta petición.
    response.cookies.getAll().forEach((c) => redireccion.cookies.set(c));
    return redireccion;
  }

  return response;
}
