import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChatVista } from "@/components/chat/chat-vista";
import { cargarChat } from "@/lib/chat-servidor";
import { getSesion } from "@/lib/sesion";

export const metadata: Metadata = { title: "Chats" };

export default function Chats({ searchParams }: PageProps<"/necesito/chats">) {
  return (
    <section className="pagina-ancha">
      <div className="page-hd">
        <div>
          <h1 className="title-lg">Chats</h1>
          <p className="muted">
            Habla directo con las compañías a las que les pides equipo. Cada chat muestra tus reservas con esa compañía y
            los avisos de cada paso.
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
        <p>Entra con tu cuenta para ver tus chats.</p>
        <Link href="/necesito" className="btn primary">Entrar</Link>
      </div>
    );
  }
  const datos = await cargarChat("cliente", sp);
  if (!datos.ok) return <p className="fine">Para usar el chat falta ejecutar el SQL 0006_chat.sql en Supabase.</p>;
  return <ChatVista lado="cliente" {...datos} />;
}
