import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { VerificacionVista } from "@/components/verificacion-vista";
import { getSesion } from "@/lib/sesion";

export const metadata: Metadata = { title: "Verifica tu compañía" };

export default function VerificarCompania() {
  return (
    <section className="page-mid">
      <Suspense fallback={<p className="muted">Revisando tu verificación…</p>}>
        <Contenido />
      </Suspense>
    </section>
  );
}

async function Contenido() {
  const s = await getSesion();
  if (!s) {
    return (
      <div className="card">
        <p>Entra con el correo de tu compañía para verificarla.</p>
        <Link href="/tengo" className="btn primary">Entrar</Link>
      </div>
    );
  }
  if (!s.compania) {
    return (
      <div className="card">
        <p>Primero registra tu compañía para poder verificarla.</p>
        <Link href="/tengo/registro" className="btn primary">Registrar mi compañía</Link>
      </div>
    );
  }
  return <VerificacionVista tipo="compania" uid={s.id} companiaId={s.compania.id} />;
}
