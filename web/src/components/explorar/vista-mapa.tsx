"use client";
/* eslint-disable @next/next/no-img-element -- fotos servidas por Supabase Storage */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Mapa, type Marcador } from "@/components/mapa";
import { equiposPara } from "@/lib/busqueda";
import { nombreEstado, urlFoto, type Categoria } from "@/lib/catalogo";
import type { Catalogo, CompaniaPublica, EquipoPublico } from "@/lib/catalogo-publico";
import { useOcupadas } from "@/lib/disponibilidad";
import { costoTransporte, distanciaKm, textoKm } from "@/lib/geo";
import { pesos } from "@/lib/medellin";
import { conCantidad, diasDeRenta, textoFecha, type GuardarPedido, type Pedido } from "@/lib/pedido";

type Paso = 1 | 2 | 3;
type Resultado = {
  c: CompaniaPublica;
  dist: number;
  transporte: number | null;
  cubiertas: number;
  nivel: "alto" | "medio" | "nada";
};
// Lo que necesitan las filas de equipos para mostrar disponibilidad y el rider.
type Rider = {
  libres: (e: EquipoPublico) => number;
  enRider: (e: EquipoPublico) => number;
  cambiar: (e: EquipoPublico, cantidad: number) => void;
};

export function VistaMapa({
  pedido,
  guardar,
  categorias,
  catalogo,
  conSesion,
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
  const [ficha, setFicha] = useState<EquipoPublico | null>(null);
  const lugar = pedido.lugar!;
  const dias = diasDeRenta(pedido.entrega, pedido.recogida);
  const nombreCat = (id: string) => categorias.find((c) => c.id === id)?.nombre ?? id;
  const necesidades = pedido.necesidades;
  const ocupadas = useOcupadas(pedido.entrega, pedido.recogida);

  const rider: Rider = {
    libres: (e) => Math.max(0, e.unidades - (ocupadas[e.id] ?? 0)),
    enRider: (e) => pedido.rider.find((i) => i.equipo_id === e.id)?.cantidad ?? 0,
    cambiar: (e, cantidad) => guardar((p) => conCantidad(p, e.id, e.compania_id, cantidad)),
  };
  const enRiderTotal = pedido.rider.reduce((a, i) => a + i.cantidad, 0);

  const resultados = useMemo<Resultado[]>(() => {
    const libres = (e: EquipoPublico) => Math.max(0, e.unidades - (ocupadas[e.id] ?? 0));
    return catalogo.companias
      .map((c) => {
        const dist = distanciaKm(c, lugar);
        const cubiertas = necesidades.filter((n) => {
          const { exactos, alternativas } = equiposPara(n, c.equipos);
          return (exactos.length ? exactos : alternativas).some((e) => libres(e) > 0);
        }).length;
        const nivel: Resultado["nivel"] =
          necesidades.length && cubiertas === necesidades.length ? "alto" : cubiertas ? "medio" : "nada";
        return { c, dist, transporte: costoTransporte(c, dist), cubiertas, nivel };
      })
      .sort((a, b) => b.cubiertas - a.cubiertas || a.dist - b.dist);
  }, [catalogo.companias, lugar, necesidades, ocupadas]);

  const marcadores = useMemo<Marcador[]>(
    () => [
      ...resultados.map((r) => ({
        id: r.c.id,
        lat: r.c.lat,
        lng: r.c.lng,
        texto: necesidades.length ? `${r.cubiertas}/${necesidades.length}` : String(r.c.equipos.length),
        titulo: `${r.c.nombre}: tiene ${r.cubiertas} de ${necesidades.length} cosas de tu pedido, a ${textoKm(r.dist)}`,
        nivel: r.nivel,
        activo: r.c.id === sel,
      })),
      {
        id: "lugar",
        lat: lugar.lat,
        lng: lugar.lng,
        texto: lugar.nombre.length > 24 ? lugar.nombre.slice(0, 23) + "…" : lugar.nombre,
        titulo: `Lugar del show: ${lugar.nombre}`,
        tipo: "lugar" as const,
      },
    ],
    [resultados, necesidades.length, lugar, sel],
  );

  const elegida = resultados.find((r) => r.c.id === sel) ?? null;

  return (
    <div className="explorar">
      <div className="resumen" aria-label="Tu pedido">
        <button type="button" className="resumen-item" onClick={() => onEditar(1)}>
          <span className="fine">Qué</span>
          <b>
            {necesidades.length === 1
              ? necesidades[0].texto || nombreCat(necesidades[0].categoria)
              : `${necesidades.length} equipos`}
          </b>
        </button>
        <button type="button" className="resumen-item" onClick={() => onEditar(2)}>
          <span className="fine">Cuándo · {dias} {dias === 1 ? "día" : "días"}</span>
          <b>
            {textoFecha(pedido.entrega)} → {textoFecha(pedido.recogida)}
          </b>
        </button>
        <button type="button" className="resumen-item" onClick={() => onEditar(3)}>
          <span className="fine">Dónde</span>
          <b>{lugar.nombre}</b>
        </button>
        <Link href="/explorar/rider" className={`resumen-item rider-link ${enRiderTotal ? "lleno" : ""}`}>
          <span className="fine">Tu rider</span>
          <b>{enRiderTotal ? `${enRiderTotal} ${enRiderTotal === 1 ? "unidad" : "unidades"} · Ver →` : "Vacío"}</b>
        </Link>
      </div>
      {conSesion && (
        <Link href="/necesito/reservas" className="link-btn" style={{ justifySelf: "end" }}>
          Mis reservas
        </Link>
      )}

      <div className="explorar-cuerpo">
        <div className="explorar-mapa">
          <Mapa
            etiqueta="Mapa de Medellín con las compañías que tienen tu pedido"
            marcadores={marcadores}
            onMarcador={(id) => id !== "lugar" && setSel(id)}
            enfoque={elegida ? { lat: elegida.c.lat, lng: elegida.c.lng } : null}
            encuadrar
          />
          {elegida && (
            <VentanaCompania
              r={elegida}
              pedido={pedido}
              dias={dias}
              rider={rider}
              nombreCat={nombreCat}
              onCerrar={() => setSel(null)}
              onFicha={setFicha}
            />
          )}
          <div className="leyenda" aria-hidden="true">
            <span><i className="alto" />Todo tu pedido</span>
            <span><i className="medio" />Parte</span>
            <span><i className="nada" />Nada</span>
          </div>
        </div>

        <aside className="explorar-lista" aria-label="Compañías">
          <h2>
            {resultados.length} {resultados.length === 1 ? "compañía" : "compañías"} en Medellín
          </h2>
          {resultados.length === 0 && (
            <p className="muted">Todavía no hay compañías con equipos publicados. Vuelve pronto.</p>
          )}
          {resultados.map((r) => (
            <button
              key={r.c.id}
              type="button"
              className={`comp-item ${r.c.id === sel ? "activo" : ""}`}
              onClick={() => setSel(r.c.id)}
              aria-pressed={r.c.id === sel}
            >
              <span className={`punto ${r.nivel}`} aria-hidden="true" />
              <span className="comp-txt">
                <b>{r.c.nombre}</b>
                <span className="fine">
                  {r.cubiertas} de {necesidades.length} de tu pedido · a {textoKm(r.dist)}
                </span>
                <span className="fine">
                  {r.transporte !== null
                    ? `Entrega ${pesos(r.transporte)}`
                    : r.c.cobertura_km > 0
                      ? `Entrega hasta ${r.c.cobertura_km} km`
                      : "Solo retiro en bodega"}
                </span>
              </span>
            </button>
          ))}
        </aside>
      </div>

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

// Ventana flotante de una compañía sobre el mapa.
function VentanaCompania({
  r,
  pedido,
  dias,
  rider,
  nombreCat,
  onCerrar,
  onFicha,
}: {
  r: Resultado;
  pedido: Pedido;
  dias: number;
  rider: Rider;
  nombreCat: (id: string) => string;
  onCerrar: () => void;
  onFicha: (e: EquipoPublico) => void;
}) {
  const { c } = r;
  const usados = new Set<string>();
  const grupos = pedido.necesidades.map((n) => {
    const { exactos, alternativas } = equiposPara(n, c.equipos);
    const items = [...exactos, ...alternativas];
    items.forEach((e) => usados.add(e.id));
    return { n, items, hayExacto: exactos.length > 0 };
  });
  const otros = c.equipos.filter((e) => !usados.has(e.id));
  const deEsta = pedido.rider.filter((i) => i.compania_id === c.id).reduce((a, i) => a + i.cantidad, 0);

  return (
    <section className="ventana" aria-label={`Equipos de ${c.nombre}`}>
      <header className="ventana-hd">
        <div>
          <span className="fine">
            Bodega en {c.zona ?? c.ciudad} · a {textoKm(r.dist)} de {pedido.lugar?.nombre}
          </span>
          <h2>{c.nombre}</h2>
        </div>
        <button type="button" className="cerrar" onClick={onCerrar} aria-label="Cerrar">×</button>
      </header>
      <div className="eq-tags">
        {c.verificada ? <span className="tag ok">✓ Verificada</span> : <span className="tag">Nueva en ENRENTA</span>}
        <span className={`tag ${r.transporte !== null ? "ok" : ""}`}>
          {r.transporte !== null
            ? `Entrega y recogida ${pesos(r.transporte)}`
            : c.cobertura_km > 0
              ? `Entrega solo hasta ${c.cobertura_km} km`
              : "Solo retiro en bodega"}
        </span>
        <span className="tag">Depósito {c.deposito_pct} %</span>
        {c.tecnico_nombre && c.tecnico_tarifa_dia ? (
          <span className="tag">{c.tecnico_nombre} · {pesos(c.tecnico_tarifa_dia)} / día</span>
        ) : null}
      </div>

      <div className="ventana-cuerpo">
        {grupos.map(({ n, items, hayExacto }) => (
          <div key={n.id} className="ventana-grupo">
            <h3>
              {n.cantidad} × {n.texto || nombreCat(n.categoria)}
            </h3>
            {items.length === 0 ? (
              <p className="fine">Esta compañía no tiene equipos de este tipo.</p>
            ) : (
              <>
                {!hayExacto && n.texto && <p className="fine">No tiene «{n.texto}» exacto. Estas son alternativas:</p>}
                {items.map((e) => (
                  <FilaEquipo key={e.id} e={e} dias={dias} pide={n.cantidad} rider={rider} onFicha={onFicha} />
                ))}
              </>
            )}
          </div>
        ))}
        {otros.length > 0 && (
          <div className="ventana-grupo">
            <h3>Otros equipos de {c.nombre}</h3>
            {otros.map((e) => (
              <FilaEquipo key={e.id} e={e} dias={dias} rider={rider} onFicha={onFicha} />
            ))}
          </div>
        )}
      </div>
      {deEsta > 0 && (
        <Link href="/explorar/rider" className="btn primary block">
          Ver rider · {deEsta} {deEsta === 1 ? "unidad" : "unidades"} de {c.nombre}
        </Link>
      )}
    </section>
  );
}

function FilaEquipo({
  e,
  dias,
  pide = 0,
  rider,
  onFicha,
}: {
  e: EquipoPublico;
  dias: number;
  pide?: number;
  rider: Rider;
  onFicha: (e: EquipoPublico) => void;
}) {
  const libres = rider.libres(e);
  return (
    <div className="fila-eq">
      <button type="button" className="fila-eq-main" onClick={() => onFicha(e)} aria-label={`Ver fotos y ficha de ${e.nombre}`}>
        <span className="eq-thumb sm">
          {e.fotos[0] ? <img src={urlFoto(e.fotos[0])} alt="" loading="lazy" /> : <span className="fine">Sin foto</span>}
        </span>
        <span className="fila-eq-txt">
          <b>{e.nombre}</b>
          <span className="fine">
            {libres} de {e.unidades} libres{pide > libres ? " (menos de las que pides)" : ""} · {pesos(e.precio_dia)} / 24 h
          </span>
          {dias > 1 && <span className="fine">{pesos(e.precio_dia * dias)} por unidad por {dias} días</span>}
        </span>
      </button>
      <ControlRider e={e} rider={rider} sugerida={Math.min(pide || 1, libres)} />
    </div>
  );
}

function ControlRider({ e, rider, sugerida }: { e: EquipoPublico; rider: Rider; sugerida: number }) {
  const libres = rider.libres(e);
  const cant = rider.enRider(e);
  if (cant > 0) {
    return (
      <div className="qty" role="group" aria-label={`Unidades de ${e.nombre} en tu rider`}>
        <button type="button" onClick={() => rider.cambiar(e, cant - 1)} aria-label="Una menos">−</button>
        <span aria-live="polite">{cant}</span>
        <button type="button" onClick={() => rider.cambiar(e, cant + 1)} disabled={cant >= libres} aria-label="Una más">+</button>
      </div>
    );
  }
  return (
    <button type="button" className="btn sm" onClick={() => rider.cambiar(e, Math.max(1, sugerida))} disabled={libres === 0}>
      {libres === 0 ? "Sin unidades" : "+ Agregar"}
    </button>
  );
}

// Ficha del equipo con fotos reales, medidas y estado.
function FichaEquipo({
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
            <span className="fine">{compania} · {nombreCat(e.categoria_id)}</span>
            <h2 id="ficha-titulo">{e.nombre}</h2>
          </div>
          <button type="button" className="cerrar" onClick={() => ref.current?.close()} aria-label="Cerrar">×</button>
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
            <span className="tag">{rider.libres(e)} de {e.unidades} libres en tus fechas</span>
          </div>
          <ControlRider e={e} rider={rider} sugerida={1} />
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
