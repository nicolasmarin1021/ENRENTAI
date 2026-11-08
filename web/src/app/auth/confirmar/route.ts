import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Llega aquí quien abre el enlace del correo en lugar de escribir el código.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const pedido = params.get("siguiente") ?? "/";
  // Solo rutas internas, para que nadie use el enlace para mandar a otro sitio.
  const siguiente = pedido.startsWith("/") && !pedido.startsWith("//") ? pedido : "/";

  const supabase = await createClient();
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const tipo = params.get("type") as EmailOtpType | null;

  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && tipo) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo })).error;
  }

  redirect(ok ? siguiente : `${siguiente}?enlace=vencido`);
}
