import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { COOKIE_ENLACE } from "@/lib/enlace";
import { createClient } from "@/lib/supabase/server";

// Solo rutas internas de ENRENTA, para que nadie use el enlace para mandar a otro sitio
// (ni "//otro-sitio" ni "/\otro-sitio", que los navegadores también leen como otro sitio).
function rutaInterna(pedido: string | null, origen: string) {
  if (!pedido || !pedido.startsWith("/") || /[\\\u0000-\u001f]/.test(pedido)) return "/";
  try {
    const u = new URL(pedido, origen);
    return u.origin === origen ? u.pathname + u.search : "/";
  } catch {
    return "/";
  }
}

// La ruta con un aviso (?enlace=…) para que la portada lo muestre.
function conAviso(ruta: string, aviso: string) {
  const u = new URL(ruta, "http://x");
  u.searchParams.set("enlace", aviso);
  return u.pathname + u.search;
}

// Llega aquí quien abre el enlace del correo en lugar de escribir el código.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const siguiente = rutaInterna(params.get("siguiente"), request.nextUrl.origin);

  const supabase = await createClient();
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const tipo = params.get("type") as EmailOtpType | null;

  // Si ya hay alguien adentro, su sesión no se cambia por la de un enlace.
  const { data: actual } = await supabase.auth.getClaims();
  if (actual?.claims) redirect(siguiente);

  // Seguridad: el enlace con token_hash solo sirve en el navegador donde se pidió el código
  // (el que trae "code" ya queda atado a ese navegador por Supabase). Así nadie puede meter a
  // otra persona en una cuenta ajena con un enlace suyo.
  const almacen = await cookies();
  if (tokenHash && !almacen.get(COOKIE_ENLACE)) redirect(conAviso(siguiente, "otro"));

  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && tipo) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo })).error;
  }
  if (ok) almacen.delete(COOKIE_ENLACE);

  redirect(ok ? siguiente : conAviso(siguiente, "vencido"));
}
