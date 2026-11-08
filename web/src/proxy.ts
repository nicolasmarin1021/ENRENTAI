import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// En Next 16 el antiguo "middleware" se llama proxy.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Todo menos archivos estáticos, imágenes y scripts públicos (como el worker del mapa).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|js)$).*)"],
};
