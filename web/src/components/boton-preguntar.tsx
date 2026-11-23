"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  companiaId: string;
  texto?: string; // comienzo del mensaje (p. ej. "Hola, tengo una pregunta sobre …")
  className?: string;
  children?: ReactNode;
};

// "Preguntar": abre el chat con una compañía para hacerle una pregunta sin cotizar (no aparta equipos).
// Se ve siempre; sin sesión lleva a entrar. No crea ninguna solicitud (SQL 0014_preguntas_chat.sql).
export function BotonPreguntar({ companiaId, texto, className = "btn", children = "Preguntar" }: Props) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");

  async function preguntar() {
    setError("");
    setOcupado(true);
    const supabase = createClient();
    const { data: sesion } = await supabase.auth.getSession();
    if (!sesion.session) {
      setOcupado(false);
      router.push("/necesito");
      return;
    }
    const { data, error: e } = await supabase.rpc("abrir_conversacion", { p_compania: companiaId });
    setOcupado(false);
    if (e || typeof data !== "string") {
      setError(
        e?.code === "PGRST202"
          ? "Falta ejecutar el SQL 0014_preguntas_chat.sql en Supabase."
          : e?.code === "P0001" && e.message
            ? e.message
            : "No pudimos abrir el chat. Intenta de nuevo.",
      );
      return;
    }
    const q = new URLSearchParams({ c: data });
    if (texto) q.set("texto", texto);
    router.push(`/necesito/chats?${q.toString()}`);
  }

  return (
    <>
      <button type="button" className={className} onClick={preguntar} disabled={ocupado}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginRight: 6, verticalAlign: "-3px" }}>
          <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12z" />
        </svg>
        {ocupado ? "Abriendo…" : children}
      </button>
      {error && <span className="form-err" role="alert">{error}</span>}
    </>
  );
}
