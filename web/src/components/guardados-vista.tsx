"use client";
/* eslint-disable @next/next/no-img-element -- fotos servidas por Supabase Storage */

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Corazon } from "@/components/corazon";
import { FichaEquipo, type Rider } from "@/components/explorar/vista-mapa";
import { IconoCategoria } from "@/components/iconos";
import { urlFoto, type Categoria } from "@/lib/catalogo";
import type { Catalogo, CompaniaPublica, EquipoPublico } from "@/lib/catalogo-publico";
import { useOcupadas } from "@/lib/disponibilidad";
import { useGuardados } from "@/lib/guardados";
import { pesos } from "@/lib/medellin";
import { conCantidad, diasDeRenta, usePedido } from "@/lib/pedido";
import { textoResumen } from "@/lib/resenas";

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

// Guardados (♡): los equipos y las compañías que la persona marcó, como las listas de Airbnb
// (igual que en la app). El ♡ va al lado de cada botón, no dentro, para que cada clic haga una
// sola cosa.
export function GuardadosVista({ catalogo, categorias }: { catalogo: Catalogo; categorias: Categoria[] }) {
  const { lista, alternar } = useGuardados();
  const [pedido, guardar] = usePedido();
  const [ficha, setFicha] = useState<EquipoPublico | null>(null);
  const [aviso, setAviso] = useState<{ n: number; texto: string } | null>(null);
  const dias = diasDeRenta(pedido.entrega, pedido.recogida);
  const conFechas = dias > 0;
  const ocupadas = useOcupadas(conFechas ? pedido.entrega : "", conFechas ? pedido.recogida : "");

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 3500);
    return () => clearTimeout(t);
  }, [aviso]);

  const rider: Rider = {
    libres: (e) => (conFechas ? Math.max(0, e.unidades - (ocupadas[e.id] ?? 0)) : e.unidades),
    enRider: (e) => pedido.rider.find((i) => i.equipo_id === e.id)?.cantidad ?? 0,
    cambiar: (e, cantidad) => {
      guardar((p) => conCantidad(p, e.id, e.compania_id, cantidad));
      if (cantidad > 0) setAviso((a) => ({ n: (a?.n ?? 0) + 1, texto: `${cantidad} × ${e.nombre} en tu rider.` }));
    },
  };

  const todos = catalogo.companias.flatMap((c) => c.equipos.map((e) => ({ e, c })));
  const equipos = lista.equipos
    .map((id) => todos.find((x) => x.e.id === id))
    .filter((x): x is { e: EquipoPublico; c: CompaniaPublica } => Boolean(x));
  const companias = lista.companias
    .map((id) => catalogo.companias.find((c) => c.id === id))
    .filter((c): c is CompaniaPublica => Boolean(c));
  // Lo que se guardó y ya no está publicado (lo pausaron o lo quitaron).
  const idsEquipos = new Set(todos.map((x) => x.e.id));
  const idsCompanias = new Set(catalogo.companias.map((c) => c.id));
  const perdidos = [
    ...lista.equipos.filter((id) => !idsEquipos.has(id)).map((id) => ["equipos", id] as const),
    ...lista.companias.filter((id) => !idsCompanias.has(id)).map((id) => ["companias", id] as const),
  ];
  const vacio = !equipos.length && !companias.length;
  // Los guardados viven en el navegador: mientras la página arranca no se sabe si hay.
  const enNavegador = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  if (!enNavegador) return <p className="muted">Cargando tus guardados…</p>;

  return (
    <div className="guardados">
      <div className="page-hd">
        <div>
          <h1 className="title-lg">Guardados</h1>
          <p className="muted">
            {vacio ? "Tus equipos y compañías favoritos." : "Lo que marcaste con ♡ para tus próximos shows."} Se guardan en
            este navegador.
          </p>
        </div>
      </div>

      {vacio && (
        <div className="empty">
          <span className="vacio-corazon" aria-hidden="true">
            ♡
          </span>
          <h2>Aún no tienes guardados</h2>
          <p className="muted">Toca ♡ en un equipo o en una compañía para tenerlos a mano aquí cuando armes tu próximo rider.</p>
          <Link href="/explorar?vista=explorar" className="btn primary">
            Explorar equipos
          </Link>
        </div>
      )}

      {perdidos.length > 0 && (
        <div className="note">
          {perdidos.length === 1 ? "Algo que guardaste ya no está publicado." : `${perdidos.length} cosas que guardaste ya no están publicadas.`}{" "}
          <button type="button" className="link-btn" onClick={() => perdidos.forEach(([t, id]) => alternar(t, id))}>
            Quitarlas de Guardados
          </button>
        </div>
      )}

      {equipos.length > 0 && (
        <section className="guardados-sec" aria-labelledby="g-equipos">
          <h2 id="g-equipos">Equipos · {equipos.length}</h2>
          <ul className="g-rejilla">
            {equipos.map(({ e, c }) => (
              <li key={e.id} className="g-equipo">
                <button type="button" className="g-toque" onClick={() => setFicha(e)}>
                  <span className="g-foto">
                    {e.fotos[0] ? <img src={urlFoto(e.fotos[0])} alt="" loading="lazy" /> : <IconoCategoria cat={e.categoria_id} size={40} />}
                  </span>
                  <b>{e.nombre}</b>
                  <span className="fine">
                    {c.nombre}
                    {c.verificada ? " ✓" : ""}
                  </span>
                  <span>
                    <b>{pesos(e.precio_dia)}</b> <span className="fine">/ 24 h</span>
                  </span>
                </button>
                <Corazon tipo="equipos" id={e.id} nombre={e.nombre} className="g-corazon" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {companias.length > 0 && (
        <section className="guardados-sec" aria-labelledby="g-companias">
          <h2 id="g-companias">Compañías · {companias.length}</h2>
          <ul className="g-companias">
            {companias.map((c) => {
              const portada = c.equipos.find((e) => e.fotos[0])?.fotos[0];
              const resumen = textoResumen(c.resenas);
              return (
                <li key={c.id} className="g-compania">
                  <Link href={`/compania/${c.id}`} className="g-compania-toque">
                    <span className="eq-thumb">
                      {portada ? <img src={urlFoto(portada)} alt="" loading="lazy" /> : <IconoCategoria cat="mic" size={26} />}
                    </span>
                    <span className="ex-info">
                      <b>
                        {c.nombre}
                        {c.verificada ? <span className="ok-txt"> ✓</span> : null}
                      </b>
                      <span className="fine">
                        {resumen ? `${resumen} · ` : ""}
                        {c.zona ?? c.ciudad} · {plural(c.equipos.length, "equipo", "equipos")}
                      </span>
                    </span>
                  </Link>
                  <Corazon tipo="companias" id={c.id} nombre={c.nombre} plano />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {aviso && (
        <div className="toast" role="status" key={aviso.n}>
          <span>{aviso.texto}</span>
          <Link href="/explorar/rider">Ver rider</Link>
        </div>
      )}
      {ficha && (
        <FichaEquipo
          e={ficha}
          compania={catalogo.companias.find((c) => c.id === ficha.compania_id)?.nombre ?? ""}
          dias={Math.max(1, dias)}
          rider={rider}
          nombreCat={(id) => categorias.find((c) => c.id === id)?.nombre ?? id}
          conFechas={conFechas}
          onCerrar={() => setFicha(null)}
        />
      )}
    </div>
  );
}
