import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FormEquipo, type EquipoInicial } from "@/components/form-equipo";
import { getCategorias } from "@/lib/categorias";
import { getSesion } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Editar equipo" };

export default function EditarEquipo({ params }: PageProps<"/tengo/inventario/[id]">) {
  return (
    <section className="page-mid">
      <Link href="/tengo/inventario" className="back-link">← Inventario</Link>
      <h1 className="title-lg">Editar equipo</h1>
      <Suspense fallback={<p className="muted">Cargando…</p>}>
        <Formulario params={params} />
      </Suspense>
    </section>
  );
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function Formulario({ params }: Pick<PageProps<"/tengo/inventario/[id]">, "params">) {
  const [{ id }, s] = await Promise.all([params, getSesion()]);
  if (!s?.compania) {
    return (
      <div className="card">
        <p>Primero registra tu compañía.</p>
        <Link href="/tengo/registro" className="btn primary">Registrar mi compañía</Link>
      </div>
    );
  }
  const noEncontrado = (
    <div className="card">
      <p>No encontramos ese equipo en tu inventario.</p>
      <Link href="/tengo/inventario" className="btn primary">Ver mi inventario</Link>
    </div>
  );
  if (!UUID.test(id)) return noEncontrado;

  const supabase = await createClient();
  const [{ data: e }, { data: c }, categorias] = await Promise.all([
    supabase
      .from("equipos")
      .select(
        "id, categoria_id, nombre, incluye, unidades, precio_dia, dimensiones, peso_kg, estado, banda_nombre, banda_min_mhz, banda_max_mhz, activo, equipo_fotos(id, ruta, orden)",
      )
      .eq("id", id)
      // Solo equipos de tu compañía (los de otras también se pueden leer si están publicados).
      .eq("compania_id", s.compania.id)
      .order("orden", { referencedTable: "equipo_fotos" })
      .maybeSingle(),
    supabase.from("companias").select("deposito_pct").eq("id", s.compania.id).single(),
    getCategorias(),
  ]);
  if (!e) return noEncontrado;

  const { equipo_fotos, ...resto } = e;
  const equipo: EquipoInicial = {
    ...resto,
    precio_dia: Number(resto.precio_dia),
    peso_kg: resto.peso_kg === null ? null : Number(resto.peso_kg),
    banda_min_mhz: resto.banda_min_mhz === null ? null : Number(resto.banda_min_mhz),
    banda_max_mhz: resto.banda_max_mhz === null ? null : Number(resto.banda_max_mhz),
    fotos: equipo_fotos ?? [],
  };

  return (
    <FormEquipo
      companiaId={s.compania.id}
      depositoPct={Number(c?.deposito_pct ?? 0)}
      categorias={categorias}
      equipo={equipo}
    />
  );
}
