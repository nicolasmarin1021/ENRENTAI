"use client";
/* eslint-disable @next/next/no-img-element -- fotos servidas por Supabase Storage */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { IconoCategoria } from "@/components/iconos";
import { Mapa, type Marcador } from "@/components/mapa";
import { equiposPara } from "@/lib/busqueda";
import { nombreEstado, urlFoto, type Categoria } from "@/lib/catalogo";
import type { Catalogo, CompaniaPublica, EquipoPublico } from "@/lib/catalogo-publico";
import { useOcupadas } from "@/lib/disponibilidad";
import { costoTransporte, distanciaKm, textoKm } from "@/lib/geo";
import { pesos } from "@/lib/medellin";
import { useEsAngosto } from "@/lib/pantalla";
import { conCantidad, diasDeRenta, type GuardarPedido, type Necesidad, type Pedido } from "@/lib/pedido";

type Paso = 1 | 2 | 3;
type Nivel = "alto" | "medio" | "nada";
type Resultado = {
  c: CompaniaPublica;
  dist: number;
  transporte: number | null;
  texto: string; // lo que muestra el marcador
  sub: string; // segunda línea en la franja
  nivel: Nivel;
  cuenta: number; // para ordenar
};
// Lo que necesitan las filas de equipos para mostrar disponibilidad y el rider.
export type Rider = {
  libres: (e: EquipoPublico) => number;
  enRider: (e: EquipoPublico) => number;
  cambiar: (e: EquipoPublico, cantidad: number) => void;
};

const corto = (n: number) =>
  n >= 1_000_000 ? `$${String(Math.round(n / 100_000) / 10).replace(".", ",")} M` : `$${Math.round(n / 1000)} mil`;
const fechaCorta = (s: string) =>
  new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .format(new Date(s))
    .replace(".", "");

// Explorar: el mapa es la pantalla y todo lo demás flota encima (como en el prototipo).
export function VistaMapa({
  pedido,
  guardar,
  categorias,
  catalogo,
  onEditar,
}: {
  pedido: Pedido;
  guardar: GuardarPedido;
  categorias: Categoria[];
  catalogo: Catalogo;
  conSesion: boolean;
  onEditar: (p: Paso) => void;
}) {
  const [sel, setSel] = useState<string | null>(null);
  const [foco, setFoco] = useState<string | null>(null); // cosa del pedido que se ve en el mapa
  const [cat, setCat] = useState("todo"); // filtro cuando el pedido no tiene cosas
  const [ficha, setFicha] = useState<EquipoPublico | null>(null);
  const [aviso, setAviso] = useState<{ n: number; texto: string } | null>(null);
  const angosto = useEsAngosto();
  const lugar = pedido.lugar!;
  const dias = diasDeRenta(pedido.entrega, pedido.recogida);
  const nombreCat = (id: string) => categorias.find((c) => c.id === id)?.nombre ?? id;
  const necesidades = pedido.necesidades;
  const ocupadas = useOcupadas(pedido.entrega, pedido.recogida);
  const todos = useMemo(() => catalogo.companias.flatMap((c) => c.equipos), [catalogo]);
  const necFoco = necesidades.find((n) => n.id === foco) ?? null;

  // El aviso de "agregado al rider" se va solo.
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 3500);
    return () => clearTimeout(t);
  }, [aviso]);

  const rider: Rider = {
    libres: (e) => Math.max(0, e.unidades - (ocupadas[e.id] ?? 0)),
    enRider: (e) => pedido.rider.find((i) => i.equipo_id === e.id)?.cantidad ?? 0,
    cambiar: (e, cantidad) => {
      guardar((p) => conCantidad(p, e.id, e.compania_id, cantidad));
      if (cantidad > 0) setAviso((a) => ({ n: (a?.n ?? 0) + 1, texto: `${cantidad} × ${e.nombre} en tu rider.` }));
    },
  };
  const enRiderTotal = pedido.rider.reduce((a, i) => a + i.cantidad, 0);

  const resultados = useMemo<Resultado[]>(() => {
    const libres = (e: EquipoPublico) => Math.max(0, e.unidades - (ocupadas[e.id] ?? 0));
    const lista: Resultado[] = [];
    for (const c of catalogo.companias) {
      const dist = distanciaKm(c, lugar);
      const base = { c, dist, transporte: costoTransporte(c, dist) };
      if (necFoco) {
        const { exactos, alternativas } = equiposPara(necFoco, c.equipos);
        const pool = exactos.length ? exactos : alternativas;
        const l = pool.reduce((a, e) => a + libres(e), 0);
        const nivel: Nivel = l >= necFoco.cantidad ? "alto" : l > 0 ? "medio" : "nada";
        lista.push({ ...base, texto: String(l), sub: `${textoKm(dist)} · ${l} libres`, nivel, cuenta: l });
      } else if (necesidades.length) {
        const cubiertas = necesidades.filter((n) => {
          const { exactos, alternativas } = equiposPara(n, c.equipos);
          return (exactos.length ? exactos : alternativas).some((e) => libres(e) > 0);
        }).length;
        const nivel: Nivel = cubiertas === necesidades.length ? "alto" : cubiertas ? "medio" : "nada";
        lista.push({
          ...base,
          texto: `${cubiertas}/${necesidades.length}`,
          sub: `${textoKm(dist)} · ${cubiertas} de ${necesidades.length} de tu pedido`,
          nivel,
          cuenta: cubiertas,
        });
      } else {
        const eqs = c.equipos.filter((e) => cat === "todo" || e.categoria_id === cat);
        if (!eqs.length) continue;
        const l = eqs.reduce((a, e) => a + libres(e), 0);
        const total = eqs.reduce((a, e) => a + e.unidades, 0);
        const nivel: Nivel = l === 0 ? "nada" : l / total >= 0.5 ? "alto" : "medio";
        lista.push({ ...base, texto: String(l), sub: `${textoKm(dist)} · ${l} libres`, nivel, cuenta: l });
      }
    }
    return lista.sort((a, b) => b.cuenta - a.cuenta || a.dist - b.dist);
  }, [catalogo.companias, lugar, necesidades, necFoco, cat, ocupadas]);

  // Estado de cada cosa del pedido en todo Medellín (para los chips de arriba).
  const estadoNec = (n: Necesidad) => {
    const { exactos, alternativas } = equiposPara(n, todos);
    const pool = exactos.length ? exactos : alternativas;
    const libres = pool.reduce((a, e) => a + rider.libres(e), 0);
    const enRider = pool.reduce((a, e) => a + rider.enRider(e), 0);
    const precios = pool.filter((e) => rider.libres(e) > 0).map((e) => e.precio_dia);
    const nivel =
      enRider >= n.cantidad ? "hecho" : exactos.length && libres >= n.cantidad ? "alto" : libres > 0 ? "medio" : "nada";
    const sub = nivel === "hecho" ? "en tu rider" : precios.length ? `desde ${corto(Math.min(...precios))}` : "sin stock";
    return { nivel, sub };
  };

  const marcadores = useMemo<Marcador[]>(
    () => [
      ...resultados.map((r) => ({
        id: r.c.id,
        lat: r.c.lat,
        lng: r.c.lng,
        texto: r.texto,
        titulo: `${r.c.nombre}: ${r.sub}`,
        nivel: r.nivel,
        activo: r.c.id === sel,
      })),
      {
        id: "lugar",
        lat: lugar.lat,
        lng: lugar.lng,
        texto: lugar.nombre.length > 28 ? lugar.nombre.slice(0, 27) + "…" : lugar.nombre,
        titulo: `Lugar del show: ${lugar.nombre}`,
        tipo: "lugar" as const,
      },
    ],
    [resultados, lugar, sel],
  );

  const elegida = resultados.find((r) => r.c.id === sel) ?? null;
  const margenes = angosto
    ? { top: 170, bottom: elegida ? 420 : 190, left: 24, right: 24 }
    : { top: 170, bottom: 180, left: 50, right: elegida ? 520 : 90 };

  return (
    <div className="stage">
      <Mapa
        etiqueta="Mapa de Medellín con las compañías que tienen tu pedido"
        className="mapa-full"
        marcadores={marcadores}
        onMarcador={(id) => id !== "lugar" && setSel(id)}
        enfoque={elegida ? { lat: elegida.c.lat, lng: elegida.c.lng } : null}
        encuadrar
        margenes={margenes}
        anillos={{ centro: lugar, km: [2, 5, 10] }}
        ruta={
          elegida
            ? {
                desde: elegida.c,
                hasta: lugar,
                texto: `${textoKm(elegida.dist)} · ${elegida.transporte !== null ? `entrega ${corto(elegida.transporte)}` : "solo retiro"}`,
              }
            : null
        }
      />

      <section className="float search-float" aria-label="Tu pedido">
        <div className="of-hd">
          <div className="of-txt">
            <span className="lbl">Tu pedido en Medellín</span>
            <div className="of-line">
              <button type="button" className="link-btn fuerte" onClick={() => onEditar(3)}>
                {lugar.nombre}
              </button>
              <span aria-hidden="true">·</span>
              <button type="button" className="link-btn fuerte" onClick={() => onEditar(2)}>
                Entrega {fechaCorta(pedido.entrega)} · hasta {fechaCorta(pedido.recogida)}
              </button>
              <span className="fine">
                {dias} {dias === 1 ? "día cobrado" : "días cobrados"}
              </span>
            </div>
          </div>
          <button type="button" className="btn sm" onClick={() => onEditar(1)}>
            Editar<span className="lg-only"> pedido</span>
          </button>
        </div>
        <div
          className="chips chips-fila"
          role="group"
          aria-label={necesidades.length ? "Ver en el mapa una cosa de tu pedido" : "Categoría"}
        >
          {necesidades.length
            ? necesidades.map((n) => {
                const st = estadoNec(n);
                return (
                  <button
                    key={n.id}
                    type="button"
                    className="chip"
                    aria-pressed={foco === n.id}
                    onClick={() => setFoco((f) => (f === n.id ? null : n.id))}
                  >
                    <i className={`nd ${st.nivel}`} aria-hidden="true" />
                    {n.texto || nombreCat(n.categoria)} ×{n.cantidad}
                    <span className="chip-sub">{st.sub}</span>
                  </button>
                );
              })
            : [{ id: "todo", nombre: "Todo" }, ...categorias].map((c) => (
                <button key={c.id} type="button" className="chip" aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>
                  {c.id !== "todo" && <IconoCategoria cat={c.id} size={16} />}
                  {c.nombre}
                </button>
              ))}
        </div>
      </section>

      {elegida && (
        <VentanaCompania
          r={elegida}
          pedido={pedido}
          dias={dias}
          rider={rider}
          foco={necFoco}
          cat={cat}
          nombreCat={nombreCat}
          onCerrar={() => setSel(null)}
          onFicha={setFicha}
        />
      )}

      {enRiderTotal > 0 && !elegida && (
        <Link href="/explorar/rider" className="float rider-pill">
          Ver rider <span className="count hot">{enRiderTotal}</span>
        </Link>
      )}

      {!(angosto && elegida) && (
        <section className="float strip" aria-label="Compañías">
          <div className="strip-hd">
            <b>
              {resultados.length} {resultados.length === 1 ? "compañía" : "compañías"} cerca de {lugar.nombre}
            </b>
            <div className="legend" aria-hidden="true">
              <span><i className="lg-ok" />Mucho stock</span>
              <span><i className="lg-warn" />Poco</span>
              <span><i className="lg-bad" />Sin stock</span>
              <span><i className="lg-venue" />Show</span>
              <span><i className="lg-ring" />2, 5 y 10 km</span>
            </div>
          </div>
          <div className="strip-row">
            {resultados.length === 0 && <p className="fine">Todavía no hay compañías con equipos publicados aquí.</p>}
            {resultados.map((r) => (
              <button key={r.c.id} type="button" className="pcard" aria-pressed={r.c.id === sel} onClick={() => setSel(r.c.id)}>
                <span className={`pc-dot ${r.nivel}`}>{r.texto}</span>
                <span>
                  <b>{r.c.nombre}</b>
                  <span className="fine">{r.sub}</span>
                </span>
              </button>
            ))}
          </div>
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
          dias={dias}
          rider={rider}
          nombreCat={nombreCat}
          onCerrar={() => setFicha(null)}
        />
      )}
    </div>
  );
}

// Ventana flotante de una compañía (como en el prototipo).
function VentanaCompania({
  r,
  pedido,
  dias,
  rider,
  foco,
  cat,
  nombreCat,
  onCerrar,
  onFicha,
}: {
  r: Resultado;
  pedido: Pedido;
  dias: number;
  rider: Rider;
  foco: Necesidad | null;
  cat: string;
  nombreCat: (id: string) => string;
  onCerrar: () => void;
  onFicha: (e: EquipoPublico) => void;
}) {
  const { c } = r;
  const necesidades = foco ? [foco] : pedido.necesidades;
  const usados = new Set<string>();
  const grupos = necesidades.map((n) => {
    const { exactos, alternativas } = equiposPara(n, c.equipos);
    const items = [...exactos, ...alternativas];
    items.forEach((e) => usados.add(e.id));
    return { n, items, hayExacto: exactos.length > 0 };
  });
  const otros = c.equipos.filter(
    (e) => !usados.has(e.id) && (necesidades.length > 0 || cat === "todo" || e.categoria_id === cat),
  );
  const deEsta = pedido.rider.filter((i) => i.compania_id === c.id).reduce((a, i) => a + i.cantidad, 0);

  return (
    <section className="float pop" aria-label={`Equipos de ${c.nombre}`}>
      <header className="pop-hd">
        <div className="of-txt">
          <span className="lbl">
            Bodega en {c.zona ?? c.ciudad} · a {textoKm(r.dist)} de {pedido.lugar?.nombre}
          </span>
          <h2>{c.nombre}</h2>
          <span className="fine">{c.verificada ? <span className="ok-txt">✓ Verificada</span> : "Nueva en ENRENTA"}</span>
        </div>
        <button type="button" className="cerrar" onClick={onCerrar} aria-label="Cerrar">
          ×
        </button>
      </header>
      <div className="pop-meta">
        <span className={`tag ${r.transporte !== null ? "ok" : ""}`}>
          {r.transporte !== null
            ? `Entrega ${c.transporte_modo === "fijo" ? "fija" : "en el lugar"} · ${pesos(r.transporte)}`
            : c.cobertura_km > 0
              ? `Entrega solo hasta ${c.cobertura_km} km`
              : "Solo retiro en bodega"}
        </span>
        <span className="tag">Depósito {c.deposito_pct} %</span>
        {c.tecnico_nombre && c.tecnico_tarifa_dia ? (
          <span className="tag">
            {c.tecnico_nombre} · {pesos(c.tecnico_tarifa_dia)}/día
          </span>
        ) : null}
      </div>
      <ul className="pop-list">
        {grupos.map(({ n, items, hayExacto }) => (
          <li key={n.id} className="pi-grupo">
            <div className="pop-filter">
              <span>
                {n.texto || nombreCat(n.categoria)} ×{n.cantidad}
              </span>
              {!items.length ? <span>No tiene de este tipo</span> : !hayExacto && n.texto ? <span>Alternativas</span> : null}
            </div>
            <ul className="pop-sub">
              {items.map((e) => (
                <FilaEquipo key={e.id} e={e} dias={dias} pide={n.cantidad} pct={c.deposito_pct} rider={rider} onFicha={onFicha} />
              ))}
            </ul>
          </li>
        ))}
        {otros.length > 0 && (
          <li className="pi-grupo">
            {necesidades.length > 0 && (
              <div className="pop-filter">
                <span>Otros equipos de {c.nombre}</span>
              </div>
            )}
            <ul className="pop-sub">
              {otros.map((e) => (
                <FilaEquipo key={e.id} e={e} dias={dias} pide={1} pct={c.deposito_pct} rider={rider} onFicha={onFicha} />
              ))}
            </ul>
          </li>
        )}
      </ul>
      {deEsta > 0 && (
        <footer className="pop-ft">
          <span>
            {deEsta} {deEsta === 1 ? "unidad" : "unidades"} de {c.nombre} en tu rider
          </span>
          <Link href="/explorar/rider" className="btn primary sm">
            Ver rider
          </Link>
        </footer>
      )}
    </section>
  );
}

// Fila de un equipo: se despliega para elegir cantidad y agregarlo al rider.
function FilaEquipo({
  e,
  dias,
  pide,
  pct,
  rider,
  onFicha,
}: {
  e: EquipoPublico;
  dias: number;
  pide: number;
  pct: number;
  rider: Rider;
  onFicha: (e: EquipoPublico) => void;
}) {
  const libres = rider.libres(e);
  const enRider = rider.enRider(e);
  const [abierta, setAbierta] = useState(false);
  const [cant, setCant] = useState(Math.max(1, Math.min(enRider || pide, libres || 1)));
  const total = e.precio_dia * cant * dias;

  return (
    <li className={`pi ${abierta ? "open" : ""} ${libres === 0 ? "out" : ""}`}>
      <button type="button" className="pi-row" aria-expanded={abierta} onClick={() => setAbierta((a) => !a)}>
        <span className="pi-ico">
          <IconoCategoria cat={e.categoria_id} size={19} />
        </span>
        <span>
          <span className="pi-name">{e.nombre}</span>
          <span className="pi-sub">
            <span>
              <b>{libres}</b> de {e.unidades} libres
            </span>
            {e.banda_nombre && (
              <span>
                {e.banda_nombre}
                {e.banda_min_mhz !== null && e.banda_max_mhz !== null
                  ? ` · ${String(e.banda_min_mhz).replace(".", ",")}–${String(e.banda_max_mhz).replace(".", ",")} MHz`
                  : ""}
              </span>
            )}
            {enRider > 0 && <span className="tag ok sm">{enRider} en tu rider</span>}
          </span>
        </span>
        <span className="pi-price">
          {pesos(e.precio_dia)}
          <small>por día</small>
        </span>
      </button>
      {abierta && (
        <div className="pi-body">
          {libres === 0 ? (
            <p className="fine">No quedan unidades libres en tus fechas.</p>
          ) : (
            <div className="pi-buy">
              <div className="qty" role="group" aria-label={`Unidades de ${e.nombre}`}>
                <button type="button" onClick={() => setCant((q) => Math.max(1, q - 1))} disabled={cant <= 1} aria-label="Una menos">
                  −
                </button>
                <span aria-live="polite">{cant}</span>
                <button
                  type="button"
                  onClick={() => setCant((q) => Math.min(libres, q + 1))}
                  disabled={cant >= libres}
                  aria-label="Una más"
                >
                  +
                </button>
              </div>
              <div className="pi-calc">
                <b>
                  Total {dias} {dias === 1 ? "día" : "días"}: {pesos(total)}
                </b>
                <span>
                  {cant} × {pesos(e.precio_dia)} por día · depósito {pesos(Math.round((total * pct) / 100))}
                </span>
              </div>
              <button type="button" className="btn primary" onClick={() => rider.cambiar(e, cant)} disabled={enRider === cant}>
                {enRider ? (enRider === cant ? "En tu rider" : "Actualizar rider") : "Agregar al rider"}
              </button>
            </div>
          )}
          <div className="row-actions">
            <button type="button" className="link-btn" onClick={() => onFicha(e)}>
              Fotos y ficha
            </button>
            {enRider > 0 && (
              <button type="button" className="link-btn" onClick={() => rider.cambiar(e, 0)}>
                Quitar del rider
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

// Ficha del equipo con fotos reales, medidas y estado.
export function FichaEquipo({
  e,
  compania,
  dias,
  rider,
  nombreCat,
  onCerrar,
}: {
  e: EquipoPublico;
  compania: string;
  dias: number;
  rider: Rider;
  nombreCat: (id: string) => string;
  onCerrar: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [foto, setFoto] = useState(0);
  const enRider = rider.enRider(e);
  const libres = rider.libres(e);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className="ficha"
      aria-labelledby="ficha-titulo"
      onClose={onCerrar}
      onClick={(ev) => ev.target === ref.current && ref.current?.close()}
    >
      <div className="ficha-in">
        <header className="ventana-hd">
          <div>
            <span className="fine">
              {compania} · {nombreCat(e.categoria_id)}
            </span>
            <h2 id="ficha-titulo">{e.nombre}</h2>
          </div>
          <button type="button" className="cerrar" onClick={() => ref.current?.close()} aria-label="Cerrar">
            ×
          </button>
        </header>

        {e.fotos.length > 0 ? (
          <div className="galeria">
            <img className="galeria-main" src={urlFoto(e.fotos[foto] ?? e.fotos[0])} alt={`Foto ${foto + 1} de ${e.nombre}`} />
            {e.fotos.length > 1 && (
              <div className="galeria-mini">
                {e.fotos.map((r, i) => (
                  <button key={r} type="button" onClick={() => setFoto(i)} aria-label={`Ver foto ${i + 1}`} aria-pressed={i === foto}>
                    <img src={urlFoto(r)} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="note">La compañía aún no ha subido fotos de este equipo.</p>
        )}

        <div className="ficha-accion">
          <div className="eq-tags">
            <span className="tag">{nombreEstado(e.estado)}</span>
            {e.banda_nombre && <span className="tag">Banda {e.banda_nombre}</span>}
            <span className="tag">
              {libres} de {e.unidades} libres en tus fechas
            </span>
          </div>
          {enRider > 0 ? (
            <span className="tag ok">{enRider} en tu rider</span>
          ) : (
            <button type="button" className="btn primary sm" onClick={() => rider.cambiar(e, 1)} disabled={libres === 0}>
              {libres === 0 ? "Sin unidades" : "+ Agregar al rider"}
            </button>
          )}
        </div>

        <dl className="dl">
          <div>
            <dt>Precio</dt>
            <dd>
              {pesos(e.precio_dia)} por unidad cada 24 h
              {dias > 1 ? ` · ${pesos(e.precio_dia * dias)} por ${dias} días` : ""}
            </dd>
          </div>
          <div>
            <dt>Unidades</dt>
            <dd>{e.unidades}</dd>
          </div>
          {e.incluye && (
            <div style={{ gridColumn: "1 / -1" }}>
              <dt>Qué incluye cada unidad</dt>
              <dd>{e.incluye}</dd>
            </div>
          )}
          <div>
            <dt>Dimensiones del estuche</dt>
            <dd>{e.dimensiones || "Sin dato"}</dd>
          </div>
          <div>
            <dt>Peso por unidad</dt>
            <dd>{e.peso_kg !== null ? `${String(e.peso_kg).replace(".", ",")} kg` : "Sin dato"}</dd>
          </div>
          {e.banda_min_mhz !== null && e.banda_max_mhz !== null && (
            <div>
              <dt>Rango de frecuencias</dt>
              <dd>
                {String(e.banda_min_mhz).replace(".", ",")} – {String(e.banda_max_mhz).replace(".", ",")} MHz
              </dd>
            </div>
          )}
        </dl>
      </div>
    </dialog>
  );
}
