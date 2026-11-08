import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { RegistroCompania } from "@/components/registro-compania";
import { getSesion } from "@/lib/sesion";

export const metadata: Metadata = { title: "Registra tu compañía" };

export default function Registro() {
  return (
    <section className="page-mid">
      <Link href="/tengo" className="back-link">← Volver</Link>
      <h1 className="title-xl">
        Registra tu <em>compañía</em>
      </h1>
      <p className="lead">Unos datos de la bodega y de cómo trabajas. Lo puedes cambiar después.</p>
      <Suspense fallback={<p className="muted">Cargando…</p>}>
        <Formulario />
      </Suspense>
    </section>
  );
}

async function Formulario() {
  const s = await getSesion();
  if (!s) {
    return (
      <div className="card">
        <p>Primero entra con el correo de tu compañía.</p>
        <Link href="/tengo" className="btn primary">Entrar</Link>
      </div>
    );
  }
  if (s.compania) {
    return (
      <div className="card">
        <p>
          Ya registraste <b>{s.compania.nombre}</b> con esta cuenta.
        </p>
        <Link href="/tengo/panel" className="btn primary">Ir a mi panel</Link>
      </div>
    );
  }
  return <RegistroCompania uid={s.id} contacto={s.nombre} correo={s.correo} />;
}
