"use client";
/* eslint-disable @next/next/no-img-element -- fotos servidas por Supabase Storage */

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Corazon } from "@/components/corazon";
import { IconoCategoria } from "@/components/iconos";
import { Mapa, type Marcador } from "@/components/mapa";
import { Subpaneles } from "@/components/subpaneles";
import { adivinarCategoria, coincide, norm } from "@/lib/busqueda";
import { nombreEstado, urlFoto, type Categoria } from "@/lib/catalogo";
import type { Catalogo, CompaniaPublica, EquipoPublico } from "@/lib/catalogo-publico";
import { useOcupadas } from "@/lib/disponibilidad";
import { distanciaKm, textoKm } from "@/lib/geo";
import { pesos } from "@/lib/medellin";
import { useEsAngosto } from "@/lib/pantalla";
import { conCantidad, diasDeRenta, textoFecha, usePedido } from "@/lib/pedido";
import { textoResumen } from "@/lib/resenas";
import { FichaEquipo, type Rider } from "./vista-mapa";

type Item = { e: EquipoPublico; c: CompaniaPublica };
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
const corto = (s: string, max = 18) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);

// Explorar (subpanel de "Buscar equipos", igual que en la app): todos los equipos publicados en
// Medellín, para mirar sin armar un pedido. Se filtran por tipo o por texto y se ven en lista o,
// si la persona lo pide, en el mapa (cada compañía con lo que tiene). Si ya eligió fechas en
// Buscar equipos, dice qué está libre.
export function ExplorarEquipos({ catalogo, categorias }: { catalogo: Catalogo; categorias: Categoria[] }) {
  const [pedido, guardar] = usePedido();
  const [texto, setTexto] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [ver, setVer] = useState<"lista" | "mapa">("lista");
  const [sel, setSel] = useState<string | null>(null);
  const [ficha, setFicha] = useState<EquipoPublico | null>(null);
  const [aviso, setAviso] = useState<{ n: number; texto: string } | null>(null);
  const angosto = useEsAngosto();

  const dias = diasDeRenta(pedido.entrega, pedido.recogida);
  const conFechas = dias > 0;
  const ocupadas = useOcupadas(conFechas ? pedido.entrega : "", conFechas ? pedido.recogida : "");
  const fechas = conFechas ? `${textoFecha(pedido.entrega)} – ${textoFecha(pedido.recogida)}` : "";
  const lugar = pedido.lugar;
  const buscado = texto.trim();
  const nombreCat = (id: string) => categorias.find((c) => c.id === id)?.nombre ?? id;

  // El aviso de "agregado al rider" se va solo.
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

  const todos = useMemo<Item[]>(() => catalogo.companias.flatMap((c) => c.equipos.map((e) => ({ e, c }))), [catalogo]);
  const orden = new Map(categorias.map((c, i) => [c.id, i]));
  const adivinada = buscado.length >= 2 ? adivinarCategoria(buscado, todos.map((x) => x.e)) : null;

  // Qué se ve: por tipo y por texto (modelo, marca, compañía o tipo de equipo).
  const exacto = (x: Item) => !!buscado && (coincide(buscado, x.e) || norm(x.c.nombre).includes(norm(buscado)));
  const items = todos
    .filter((x) => (!cat || x.e.categoria_id === cat) && (!buscado || exacto(x) || x.e.categoria_id === adivinada))
    .sort(
      (a, b) =>
        Number(exacto(b)) - Number(exacto(a)) ||
        (orden.get(a.e.categoria_id) ?? 99) - (orden.get(b.e.categoria_id) ?? 99) ||
        (conFechas ? Number(rider.libres(b.e) > 0) - Number(rider.libres(a.e) > 0) : 0) ||
        a.e.nombre.localeCompare(b.e.nombre),
    );
  const porCompania = Array.from(
    items.reduce((m, x) => m.set(x.c.id, [...(m.get(x.c.id) ?? []), x]), new Map<string, Item[]>()).values(),
  );
  const filtrado = !!cat || !!buscado;

  function limpiar() {
    setTexto("");
    setCat(null);
    setSel(null);
  }
  function cambiarVer(v: "lista" | "mapa") {
    setSel(null);
    setVer(v);
    window.scrollTo({ top: 0 });
  }

  const buscador = (
    <>
      <div className="buscador">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4.5 4.5" />
        </svg>
        <input
          type="search"
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setSel(null);
          }}
          placeholder="Marca, modelo o compañía"
          aria-label="Buscar entre todos los equipos"
          autoComplete="off"
        />
        {texto && (
          <button type="button" className="buscador-borrar" onClick={() => setTexto("")} aria-label="Borrar la búsqueda">
            ×
          </button>
        )}
      </div>
      <div className="chips chips-fila" role="group" aria-label="Tipo de equipo">
        {[{ id: null, nombre: "Todos" }, ...categorias].map((k) => (
          <button
            key={k.id ?? "todos"}
            type="button"
            className="chip"
            aria-pressed={cat === k.id}
            onClick={() => {
              setSel(null);
              setCat(k.id);
            }}
          >
            {k.id && <IconoCategoria cat={k.id} size={16} />}
            {k.nombre}
          </button>
        ))}
      </div>
    </>
  );

  // Lo que comparten la lista y el mapa: el aviso del rider y la ficha del equipo.
  const extras: ReactNode = (
    <>
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
          nombreCat={nombreCat}
          conFechas={conFechas}
          onCerrar={() => setFicha(null)}
        />
      )}
    </>
  );

  // ---- Mapa: cada compañía con lo que tiene ----
  if (ver === "mapa") {
    const marcadores: Marcador[] = porCompania.map((lista) => {
      const c = lista[0].c;
      const algoLibre = !conFechas || lista.some((x) => rider.libres(x.e) > 0);
      return {
        id: c.id,
        lat: c.lat,
        lng: c.lng,
        texto: buscado ? corto(lista[0].e.nombre) + (lista.length > 1 ? ` +${lista.length - 1}` : "") : plural(lista.length, "equipo", "equipos"),
        titulo: `${c.nombre}: ${plural(lista.length, "equipo", "equipos")}`,
        nivel: algoLibre ? "alto" : "nada",
        activo: c.id === sel,
      };
    });
    if (lugar) {
      marcadores.push({
        id: "lugar",
        lat: lugar.lat,
        lng: lugar.lng,
        texto: corto(lugar.nombre, 28),
        titulo: `Lugar del show: ${lugar.nombre}`,
        tipo: "lugar",
      });
    }
    const elegida = sel ? (porCompania.find((l) => l[0].c.id === sel) ?? null) : null;
    const margenes = angosto
      ? { top: 190, bottom: elegida ? 420 : 110, left: 24, right: 24 }
      : { top: 190, bottom: 110, left: 50, right: elegida ? 520 : 90 };

    return (
      <div className="stage">
        <Mapa
          etiqueta="Mapa de Medellín con las compañías y sus equipos publicados"
          className="mapa-full"
          marcadores={marcadores}
          onMarcador={(id) => id !== "lugar" && setSel(id)}
          enfoque={elegida ? { lat: elegida[0].c.lat, lng: elegida[0].c.lng } : null}
          encuadrar
          margenes={margenes}
        />
        <section className="float search-float" aria-label="Buscar en Explorar">
          <Subpaneles vista="explorar" />
          {buscador}
          {!porCompania.length && <p className="fine">Ninguna compañía tiene eso publicado.</p>}
        </section>

        {elegida && (
          <VentanaExplorar
            lista={elegida}
            lugar={lugar}
            fechas={fechas}
            rider={rider}
            conFechas={conFechas}
            onFicha={setFicha}
            onCerrar={() => setSel(null)}
          />
        )}

        {!(angosto && elegida) && (
          <button type="button" className="float pildora-vista" onClick={() => cambiarVer("lista")}>
            Lista
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
            </svg>
          </button>
        )}
        {extras}
      </div>
    );
  }

  // ---- Lista ----
  return (
    <section className="explorar-lista">
      <Subpaneles vista="explorar" />
      <div className="explorar-hd">
        <div className="explorar-titulo">
          <h1 className="title-lg">Explorar equipos</h1>
          <p className="muted">Todo lo que las compañías tienen publicado en Medellín, sin armar un pedido.</p>
        </div>
        {buscador}
      </div>

      <div className="explorar-resumen">
        <b>
          {items.length
            ? `${plural(items.length, "equipo", "equipos")} de ${plural(porCompania.length, "compañía", "compañías")}`
            : "No encontramos equipos"}
        </b>
        <span className="fine">
          {conFechas ? (
            `Disponibilidad para tus fechas: ${fechas}`
          ) : (
            <>
              Elige fechas en <Link href="/explorar">Buscar equipos</Link> para ver qué está libre en tu show.
            </>
          )}
        </span>
      </div>

      {!items.length ? (
        <div className="empty">
          <p className="muted">
            {buscado
              ? `Nada coincide con «${buscado}»${cat ? ` en ${nombreCat(cat)}` : ""}.`
              : "No hay equipos de este tipo publicados todavía."}
          </p>
          {filtrado && (
            <button type="button" className="btn sm" onClick={limpiar}>
              Ver todos los equipos
            </button>
          )}
        </div>
      ) : (
        <ul className="ex-lista">
          {items.map((x, i) => {
            const titulo =
              !cat && !buscado && (i === 0 || items[i - 1].e.categoria_id !== x.e.categoria_id) ? nombreCat(x.e.categoria_id) : null;
            return (
              <FilaExplorar
                key={x.e.id}
                x={x}
                titulo={titulo}
                rider={rider}
                conFechas={conFechas}
                km={lugar ? distanciaKm(x.c, lugar) : null}
                onFicha={setFicha}
              />
            );
          })}
        </ul>
      )}

      {/* Lista ↔ mapa, solo cuando la persona lo pide (como el botón "Mapa" de Airbnb). */}
      <button type="button" className="pildora-vista fija" onClick={() => cambiarVer("mapa")}>
        Mapa
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m9 4-5 2v14l5-2 6 2 5-2V4l-5 2-6-2zM9 4v14M15 6v14" />
        </svg>
      </button>
      {extras}
    </section>
  );
}

// Un equipo en la lista: foto, nombre, compañía, precio de referencia y si está libre.
function FilaExplorar({
  x,
  titulo,
  rider,
  conFechas,
  km,
  onFicha,
}: {
  x: Item;
  titulo: string | null; // nombre del tipo de equipo cuando empieza uno nuevo
  rider: Rider;
  conFechas: boolean;
  km: number | null;
  onFicha: (e: EquipoPublico) => void;
}) {
  const { e, c } = x;
  const libres = rider.libres(e);
  const enRider = rider.enRider(e);
  return (
    <>
      {titulo && <li className="ex-sec">{titulo}</li>}
      <li className="ex-item">
        <button type="button" className="ex-toque" onClick={() => onFicha(e)}>
          <span className="eq-thumb">
            {e.fotos[0] ? <img src={urlFoto(e.fotos[0])} alt="" loading="lazy" /> : <IconoCategoria cat={e.categoria_id} size={30} />}
          </span>
          <span className="ex-info">
            <b>{e.nombre}</b>
            <span className="fine">
              {c.nombre}
              {c.verificada ? " ✓" : ""}
              {km !== null ? ` · a ${textoKm(km)}` : c.zona ? ` · ${c.zona}` : ""}
            </span>
            <span>
              <b className="ex-precio">{pesos(e.precio_dia)}</b> <span className="fine">/ 24 h · {nombreEstado(e.estado)}</span>
            </span>
            {conFechas ? (
              <span className={`fine ${libres > 0 ? "libre-si" : "libre-no"}`}>
                {libres > 0 ? `${libres} de ${e.unidades} libres en tus fechas` : "Sin unidades libres en tus fechas"}
              </span>
            ) : (
              <span className="fine">{plural(e.unidades, "unidad", "unidades")}</span>
            )}
            {enRider > 0 && <span className="tag ok sm">{enRider} en tu rider</span>}
          </span>
        </button>
        <Corazon id={e.id} nombre={e.nombre} plano />
      </li>
    </>
  );
}

// En el mapa: la compañía elegida con los equipos que coinciden.
function VentanaExplorar({
  lista,
  lugar,
  fechas,
  rider,
  conFechas,
  onFicha,
  onCerrar,
}: {
  lista: Item[];
  lugar: { nombre: string; lat: number; lng: number } | null;
  fechas: string;
  rider: Rider;
  conFechas: boolean;
  onFicha: (e: EquipoPublico) => void;
  onCerrar: () => void;
}) {
  const c = lista[0].c;
  const resumen = textoResumen(c.resenas);
  return (
    <section className="float pop" aria-label={`Equipos de ${c.nombre}`}>
      <header className="pop-hd">
        <div className="of-txt">
          <span className="lbl">
            Bodega en {c.zona ?? c.ciudad}
            {lugar ? ` · a ${textoKm(distanciaKm(c, lugar))} de ${lugar.nombre}` : ""}
          </span>
          <h2>{c.nombre}</h2>
          <span className="fine">
            {c.verificada ? <span className="ok-txt">✓ Verificada</span> : "Nueva en ENRENTA"}
            {" · "}
            {resumen ? <span className="estrellas-txt">{resumen}</span> : "Sin reseñas aún"}
            {" · "}
            <Link href={`/compania/${c.id}`} className="link-btn">
              Perfil y reseñas
            </Link>
          </span>
        </div>
        <button type="button" className="cerrar" onClick={onCerrar} aria-label="Cerrar">
          ×
        </button>
      </header>
      <div className="pop-meta">
        <span className="tag">
          {plural(lista.length, "equipo", "equipos")} · desde {pesos(Math.min(...lista.map((x) => x.e.precio_dia)))} por 24 h
        </span>
        {fechas && <span className="tag">{fechas}</span>}
      </div>
      <ul className="pop-list">
        {lista.map(({ e }) => {
          const libres = rider.libres(e);
          const enRider = rider.enRider(e);
          return (
            <li key={e.id} className={`pi ${conFechas && libres === 0 ? "out" : ""}`}>
              <div className="pi-linea">
                <button type="button" className="pi-row" onClick={() => onFicha(e)}>
                  <span className="pi-ico">
                    <IconoCategoria cat={e.categoria_id} size={19} />
                  </span>
                  <span>
                    <span className="pi-name">{e.nombre}</span>
                    <span className="pi-sub">
                      <span>{conFechas ? `${libres} de ${e.unidades} libres` : plural(e.unidades, "unidad", "unidades")}</span>
                      {enRider > 0 && <span className="tag ok sm">{enRider} en tu rider</span>}
                    </span>
                  </span>
                  <span className="pi-price">
                    {pesos(e.precio_dia)}
                    <small>por día</small>
                  </span>
                </button>
                <Corazon id={e.id} nombre={e.nombre} plano />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
