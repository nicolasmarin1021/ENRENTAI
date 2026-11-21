import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminVerificaciones } from "@/components/admin-verificaciones";
import { getSesion } from "@/lib/sesion";

export const metadata: Metadata = { title: "Verificaciones" };

// Solo para admins (perfiles.es_admin). La base de datos también lo exige: las funciones de
// revisión rechazan a quien no es admin y las fotos privadas solo se le muestran a un admin.
export default function Verificaciones() {
  return (
    <section className="page-mid">
      <Suspense fallback={<p className="muted">Cargando verificaciones…</p>}>
        <Contenido />
      </Suspense>
    </section>
  );
}

async function Contenido() {
  const s = await getSesion();
  if (!s?.admin) {
    return (
      <div className="card">
        <p>Esta página es solo para los administradores de ENRENTA.</p>
        <Link href="/explorar" className="btn primary">Ir a Buscar equipos</Link>
      </div>
    );
  }
  return <AdminVerificaciones />;
}
