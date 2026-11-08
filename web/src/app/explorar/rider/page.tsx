import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { RiderVista } from "@/components/explorar/rider";
import { getCatalogo } from "@/lib/catalogo-publico";
import { getSesion } from "@/lib/sesion";

export const metadata: Metadata = { title: "Tu rider" };

export default function Rider() {
  return (
    <Suspense fallback={<p className="muted">Cargando tu rider…</p>}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  await connection();
  const [catalogo, s] = await Promise.all([getCatalogo(), getSesion()]);
  return <RiderVista catalogo={catalogo} conSesion={s !== null} />;
}
