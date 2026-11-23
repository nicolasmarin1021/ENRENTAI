import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChatVista } from "@/components/chat/chat-vista";
import { cargarChat } from "@/lib/chat-servidor";
import { getSesion } from "@/lib/sesion";

export const metadata: Metadata = { title: "Mensajes" };

export default function Chats({ searchParams }: PageProps<"/necesito/chats">) {
  return (
    <section className="pagina-ancha">
      <div className="page-hd">
        <div>
          <h1 className="title-lg">Mensajes</h1>
          <p className="muted">
            Pregúntale a una compañía lo que necesites antes de cotizar. Preguntar no es una solicitud y no aparta
            equipos; cuando quieras cotizar, hazlo desde tu rider.
          </p>
        </div>
      </div>
      <Suspense fallback={<p className="muted">Cargando tus conversaciones…</p>}>
        <Contenido searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function Contenido({ searchParams }: Pick<PageProps<"/necesito/chats">, "searchParams">) {
  const [sp, s] = await Promise.all([searchParams, getSesion()]);
  if (!s) {
    return (
      <div className="empty">
        <p>Entra con tu cuenta para ver tus mensajes.</p>
        <Link href="/necesito" className="btn primary">Entrar</Link>
      </div>
    );
  }
  const datos = await cargarChat("cliente", sp);
  if (!datos.ok) return <p className="fine">Para usar el chat falta ejecutar el SQL 0014_preguntas_chat.sql en Supabase.</p>;
  const textoInicial = typeof sp.texto === "string" ? sp.texto.slice(0, 500) : "";
  return <ChatVista lado="cliente" {...datos} textoInicial={textoInicial} />;
}
