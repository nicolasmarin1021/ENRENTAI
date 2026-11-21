import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { GuardadosVista } from "@/components/guardados-vista";
import { getCatalogo } from "@/lib/catalogo-publico";
import { getCategorias } from "@/lib/categorias";

export const metadata: Metadata = { title: "Guardados" };

// Guardados (♡): no necesita cuenta; la lista vive en este navegador (lib/guardados.ts).
export default function Guardados() {
  return (
    <section className="pagina-media">
      <Suspense fallback={<p className="muted">Cargando tus guardados…</p>}>
        <Contenido />
      </Suspense>
    </section>
  );
}

async function Contenido() {
  // El inventario cambia en cualquier momento: se consulta en cada visita.
  await connection();
  const [catalogo, categorias] = await Promise.all([getCatalogo(), getCategorias()]);
  return <GuardadosVista catalogo={catalogo} categorias={categorias} />;
}
