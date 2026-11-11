import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FormEquipo } from "@/components/form-equipo";
import { getCategorias } from "@/lib/categorias";
import { getSesion } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Publicar equipo" };

export default function NuevoEquipo() {
  return (
    <section className="page-mid">
      <Link href="/tengo/inventario" className="back-link">← Inventario</Link>
      <h1 className="title-lg">Publicar equipo</h1>
      <Suspense fallback={<p className="muted">Cargando…</p>}>
        <Formulario />
      </Suspense>
    </section>
  );
}

async function Formulario() {
  const s = await getSesion();
  if (!s?.compania) {
    return (
      <div className="card">
        <p>Primero registra tu compañía.</p>
        <Link href="/tengo/registro" className="btn primary">Registrar mi compañía</Link>
      </div>
    );
  }
  const supabase = await createClient();
  const [{ data: c }, categorias] = await Promise.all([
    supabase.from("companias").select("deposito_pct").eq("id", s.compania.id).single(),
    getCategorias(),
  ]);
  return <FormEquipo companiaId={s.compania.id} depositoPct={Number(c?.deposito_pct ?? 0)} categorias={categorias} />;
}
