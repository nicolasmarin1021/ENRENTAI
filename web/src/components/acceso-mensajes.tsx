import Link from "next/link";
import type { Lado } from "@/lib/chat";
import { createClient } from "@/lib/supabase/server";

// Acceso a los mensajes (preguntas de clientes a compañías), con los que no se han leído.
// Va dentro de un <Suspense>: lee la sesión.
export async function AccesoMensajes({ lado }: { lado: Lado }) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("chats_sin_leer", { p_lado: lado });
  if (error) return null; // falta el SQL del chat: no se muestra
  const n = Number(data) || 0;
  const href = lado === "cliente" ? "/necesito/chats" : "/tengo/mensajes";
  return (
    <Link href={href} className={`card acceso-msj${n > 0 ? " hay" : ""}`}>
      <span>
        <b>{lado === "cliente" ? "Mensajes" : "Preguntas de clientes"}</b>
        <span className="fine bloque">
          {n > 0
            ? `${n} sin leer`
            : lado === "cliente"
              ? "Pregúntale a una compañía antes de cotizar"
              : "Lo que te preguntan antes de cotizar"}
        </span>
      </span>
      {n > 0 ? <span className="count hot">{n}</span> : <span aria-hidden="true">›</span>}
    </Link>
  );
}
