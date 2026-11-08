/* eslint-disable @next/next/no-img-element -- las fotos ya vienen listas desde Supabase Storage */
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { NavTengo } from "@/components/nav-tengo";
import { nombreEstado, urlFoto } from "@/lib/catalogo";
import { getCategorias } from "@/lib/categorias";
import { pesos } from "@/lib/medellin";
import { getSesion } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Inventario" };

export default function Inventario() {
  return (
    <section className="page-mid">
      <NavTengo actual="inventario" />
      <Suspense fallback={<p className="muted">Cargando tu inventario…</p>}>
        <Lista />
      </Suspense>
    </section>
  );
}

type Fila = {
  id: string;
  nombre: string;
  categoria_id: string;
  unidades: number;
  precio_dia: number;
  estado: string;
  activo: boolean;
  banda_nombre: string | null;
  equipo_fotos: { ruta: string; orden: number }[];
};

async function Lista() {
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
  const [{ data, error }, categorias] = await Promise.all([
    supabase
      .from("equipos")
      .select("id, nombre, categoria_id, unidades, precio_dia, estado, activo, banda_nombre, equipo_fotos(ruta, orden)")
      .eq("compania_id", s.compania.id)
      .order("creado", { ascending: false })
      .order("orden", { referencedTable: "equipo_fotos" }),
    getCategorias(),
  ]);
  const equipos = (data ?? []) as Fila[];
  const cat = new Map(categorias.map((c) => [c.id, c.nombre]));
  const activos = equipos.filter((e) => e.activo).length;

  return (
    <>
      <div className="page-hd">
        <div>
          <h1 className="title-lg">Inventario</h1>
          <p className="muted">
            {equipos.length
              ? `${equipos.length} ${equipos.length === 1 ? "equipo" : "equipos"} · ${activos} ${activos === 1 ? "publicado" : "publicados"}`
              : "Los equipos que publiques aparecen en el mapa y en las búsquedas de Medellín."}
          </p>
        </div>
        {equipos.length > 0 && (
          <Link href="/tengo/inventario/nuevo" className="btn primary">+ Publicar equipo</Link>
        )}
      </div>

      {error && <p className="form-err">No pudimos cargar tu inventario. Recarga la página.</p>}

      {!error && equipos.length === 0 && (
        <div className="empty">
          <h2>Publica tu primer equipo</h2>
          <p className="muted">
            Agrega marca y modelo, cuántas unidades tienes, el precio por 24 horas y fotos reales del equipo y su estuche.
          </p>
          <Link href="/tengo/inventario/nuevo" className="btn primary lg">+ Publicar equipo</Link>
        </div>
      )}

      {equipos.length > 0 && (
        <ul className="eq-list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {equipos.map((e) => {
            const portada = e.equipo_fotos[0];
            return (
              <li key={e.id} className="eq-item">
                <div className="eq-thumb">
                  {portada ? (
                    <img src={urlFoto(portada.ruta)} alt="" loading="lazy" />
                  ) : (
                    <span className="fine">Sin fotos</span>
                  )}
                </div>
                <div className="eq-info">
                  <b>{e.nombre}</b>
                  <div className="eq-meta">
                    <span>{cat.get(e.categoria_id) ?? e.categoria_id}</span>
                    <span>{e.unidades} {e.unidades === 1 ? "unidad" : "unidades"}</span>
                    <span>{pesos(e.precio_dia)} / 24 h</span>
                  </div>
                  <div className="eq-tags">
                    {e.activo ? <span className="tag ok">Publicado</span> : <span className="tag">Pausado</span>}
                    <span className="tag">{nombreEstado(e.estado)}</span>
                    {e.banda_nombre && <span className="tag">Banda {e.banda_nombre}</span>}
                    {e.equipo_fotos.length === 0 && <span className="tag warn">Agrega fotos</span>}
                  </div>
                </div>
                <Link href={`/tengo/inventario/${e.id}`} className="btn sm">Editar</Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
