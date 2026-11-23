import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChatVista } from "@/components/chat/chat-vista";
import { cargarChat } from "@/lib/chat-servidor";
import { getSesion } from "@/lib/sesion";

export const metadata: Metadata = { title: "Preguntas de clientes" };

export default function Mensajes({ searchParams }: PageProps<"/tengo/mensajes">) {
  return (
    <section className="pagina-ancha">
      <div className="page-hd">
        <div>
          <h1 className="title-lg">Preguntas de clientes</h1>
          <p className="muted">
            Lo que te preguntan antes de cotizar y las conversaciones con quienes te piden equipo. Responde aquí; las
            cotizaciones siguen llegando a tu panel y a tu WhatsApp.
          </p>
        </div>
      </div>
      <Suspense fallback={<p className="muted">Cargando tus conversaciones…</p>}>
        <Contenido searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function Contenido({ searchParams }: Pick<PageProps<"/tengo/mensajes">, "searchParams">) {
  const [sp, s] = await Promise.all([searchParams, getSesion()]);
  if (!s?.compania) {
    return (
      <div className="card">
        <p>Primero registra tu compañía.</p>
        <Link href="/tengo/registro" className="btn primary">Registrar mi compañía</Link>
      </div>
    );
  }
  const datos = await cargarChat("compania", sp);
  if (!datos.ok) return <p className="fine">Para usar el chat falta ejecutar el SQL 0014_preguntas_chat.sql en Supabase.</p>;
  return <ChatVista lado="compania" {...datos} />;
}
