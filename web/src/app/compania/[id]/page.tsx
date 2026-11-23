/* eslint-disable @next/next/no-img-element -- fotos ya optimizadas en Storage */
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BotonPreguntar } from "@/components/boton-preguntar";
import { Corazon } from "@/components/corazon";
import { Estrellas, ListaResenas } from "@/components/resenas";
import { urlFoto } from "@/lib/catalogo";
import { pesos } from "@/lib/medellin";
import { SELECT_RESENA, promedioTexto, type Resena } from "@/lib/resenas";
import { crearClientePublico } from "@/lib/supabase/publico";

export const metadata: Metadata = { title: "Perfil de la compañía" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Compania = {
  id: string;
  nombre: string;
  zona: string | null;
  ciudad: string;
  verificada: boolean;
  descripcion: string | null;
  creado: string;
};
type Equipo = {
  id: string;
  nombre: string;
  unidades: number;
  precio_dia: number;
  equipo_fotos: { ruta: string; orden: number }[];
};

// Perfil público de una compañía: sus equipos y sus reseñas (se puede compartir).
export default function PaginaCompania({ params }: PageProps<"/compania/[id]">) {
  return (
    <section className="pagina-media perfil-compania">
      <Suspense fallback={<p className="muted">Cargando el perfil…</p>}>
        <Contenido params={params} />
      </Suspense>
    </section>
  );
}

async function Contenido({ params }: Pick<PageProps<"/compania/[id]">, "params">) {
  const { id } = await params;
  const noEncontrada = (
    <div className="card">
      <p>No encontramos esa compañía.</p>
      <Link href="/explorar" className="btn primary">Ir a Explorar</Link>
    </div>
  );
  if (!UUID.test(id)) return noEncontrada;

  const sb = crearClientePublico();
  const [{ data: c }, { data: eqs }, { data: rs }] = await Promise.all([
    sb.from("companias").select("id, nombre, zona, ciudad, verificada, descripcion, creado").eq("id", id).maybeSingle<Compania>(),
    sb.from("equipos").select("id, nombre, unidades, precio_dia, equipo_fotos(ruta, orden)").eq("compania_id", id).order("nombre"),
    sb.from("resenas").select(SELECT_RESENA).eq("compania_id", id).order("creado", { ascending: false }).limit(50),
  ]);
  if (!c) return noEncontrada;
  const equipos = (eqs ?? []) as Equipo[];
  const resenas = (rs ?? []) as Resena[];
  const promedio = resenas.length ? resenas.reduce((a, r) => a + r.estrellas, 0) / resenas.length : 0;

  return (
    <>
      <div className="page-hd">
        <div>
          <span className="fine">
            Bodega en {c.zona ?? c.ciudad} · en ENRENTA desde {new Date(c.creado).getFullYear()}
          </span>
          <h1 className="title-lg">{c.nombre}</h1>
          <p className="muted">
            {c.verificada ? <span className="ok-txt">✓ Compañía verificada</span> : "Nueva en ENRENTA"}
            {" · "}
            {resenas.length ? (
              <>
                <Estrellas valor={promedio} /> {promedioTexto(promedio)} de 5 · {resenas.length}{" "}
                {resenas.length === 1 ? "reseña" : "reseñas"}
              </>
            ) : (
              "Sin reseñas aún"
            )}
          </p>
        </div>
        <div className="row-actions">
          <BotonPreguntar companiaId={c.id} />
          <Link href="/explorar" className="btn primary">
            Agendar en Explorar
          </Link>
        </div>
      </div>

      {c.descripcion && <p className="card">{c.descripcion}</p>}

      <section className="seccion" aria-labelledby="perfil-equipos">
        <div className="sec-hd">
          <h2 id="perfil-equipos">Equipos publicados</h2>
          <span className="fine">Precios de referencia por día</span>
        </div>
        {equipos.length ? (
          <ul className="perfil-equipos">
            {equipos.map((e) => {
              const foto = [...e.equipo_fotos].sort((a, b) => a.orden - b.orden)[0];
              return (
                <li key={e.id} className="card">
                  {foto ? <img src={urlFoto(foto.ruta)} alt="" loading="lazy" /> : <span className="sin-foto" aria-hidden="true" />}
                  <span>
                    <b>{e.nombre}</b>
                    <span className="fine bloque">
                      {pesos(e.precio_dia)} por día · {e.unidades} {e.unidades === 1 ? "unidad" : "unidades"}
                    </span>
                  </span>
                  <Corazon id={e.id} nombre={e.nombre} plano />
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="vacio">Esta compañía todavía no tiene equipos publicados.</p>
        )}
      </section>

      <section className="seccion" aria-labelledby="perfil-resenas">
        <div className="sec-hd">
          <h2 id="perfil-resenas">Reseñas</h2>
          <span className="fine">De clientes que rentaron por ENRENTA</span>
        </div>
        <div className="card">
          <ListaResenas resenas={resenas} compania={c.nombre} />
        </div>
      </section>
    </>
  );
}
