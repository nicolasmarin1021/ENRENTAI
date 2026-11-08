import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { Explorador } from "@/components/explorar/explorador";
import { getCatalogo } from "@/lib/catalogo-publico";
import { getCategorias } from "@/lib/categorias";
import { getSesion } from "@/lib/sesion";

export const metadata: Metadata = { title: "Explorar" };

export default function Explorar() {
  return (
    <Suspense fallback={<p className="muted">Cargando equipos disponibles en Medellín…</p>}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  // El inventario cambia en cualquier momento: se consulta en cada visita.
  await connection();
  const [catalogo, categorias, s] = await Promise.all([getCatalogo(), getCategorias(), getSesion()]);
  return <Explorador catalogo={catalogo} categorias={categorias} conSesion={s !== null} />;
}
