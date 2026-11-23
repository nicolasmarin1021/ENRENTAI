import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { VerificacionVista } from "@/components/verificacion-vista";
import { getSesion } from "@/lib/sesion";

export const metadata: Metadata = { title: "Verifica tu identidad" };

export default function VerificarIdentidad() {
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
        <p>Entra a tu cuenta para verificar tu identidad.</p>
        <Link href="/necesito" className="btn primary">Entrar</Link>
      </div>
    );
  }
  return <VerificacionVista tipo="cliente" uid={s.id} />;
}
