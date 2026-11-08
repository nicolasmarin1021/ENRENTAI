"use client";
/* eslint-disable @next/next/no-img-element -- fotos servidas por Supabase Storage */

import Link from "next/link";
import { useState } from "react";
import { urlFoto } from "@/lib/catalogo";
import type { Catalogo, CompaniaPublica, EquipoPublico } from "@/lib/catalogo-publico";
import { calcularCobro, SERVICIO } from "@/lib/cobro";
import { useOcupadas } from "@/lib/disponibilidad";
import { textoKm } from "@/lib/geo";
import { pesos } from "@/lib/medellin";
import {
  aISO,
  conCantidad,
  diasDeRenta,
  textoFecha,
  usePedido,
  type GuardarPedido,
  type OpcionesCompania,
  type Pedido,
} from "@/lib/pedido";
import { createClient } from "@/lib/supabase/client";

type Hecha = { compania: string; codigo: string };

export function RiderVista({ catalogo, conSesion }: { catalogo: Catalogo; conSesion: boolean }) {
  const [pedido, guardar] = usePedido();
  const [hechas, setHechas] = useState<Hecha[]>([]);
  const [version, setVersion] = useState(0); // recarga la disponibilidad tras reservar
  const ocupadas = useOcupadas(pedido.entrega, pedido.recogida, version);
  const dias = diasDeRenta(pedido.entrega, pedido.recogida);
  const listo = pedido.lugar !== null && dias > 0;

  const equipo = (id: string) => catalogo.companias.flatMap((c) => c.equipos).find((e) => e.id === id);
  const companias = [...new Set(pedido.rider.map((i) => i.compania_id))]
    .map((id) => catalogo.companias.find((c) => c.id === id))
    .filter((c): c is CompaniaPublica => Boolean(c));
  const huerfanos = pedido.rider.filter((i) => !equipo(i.equipo_id));

  return (
    <div className="page-mid">
      <Link href="/explorar" className="back-link">← Volver al mapa</Link>
      <div>
        <h1 className="title-lg">Tu rider</h1>
        {listo && (
          <p className="muted">
            {textoFecha(pedido.entrega)} → {textoFecha(pedido.recogida)} · {dias} {dias === 1 ? "día" : "días"} ·{" "}
            {pedido.lugar!.nombre}
          </p>
        )}
      </div>

      {hechas.map((h) => (
        <div key={h.codigo} className="form-ok" role="status">
          Solicitud <b>{h.codigo}</b> enviada a {h.compania}. Te avisamos cuando la compañía responda.{" "}
          <Link href="/necesito/reservas">Ver mis reservas</Link>
        </div>
      ))}

      {huerfanos.length > 0 && (
        <div className="note">
          {huerfanos.length === 1 ? "Un equipo de tu rider ya no está publicado." : `${huerfanos.length} equipos de tu rider ya no están publicados.`}{" "}
          <button
            type="button"
            className="link-btn"
            onClick={() => guardar({ ...pedido, rider: pedido.rider.filter((i) => equipo(i.equipo_id)) })}
          >
            Quitarlos
          </button>
        </div>
      )}

      {!listo ? (
        <div className="empty">
          <h2>Completa tu pedido</h2>
          <p className="muted">Elige qué necesitas, las fechas y el lugar del show para armar tu rider.</p>
          <Link href="/explorar" className="btn primary">Ir a Explorar</Link>
        </div>
      ) : companias.length === 0 ? (
        <div className="empty">
          <h2>Tu rider está vacío</h2>
          <p className="muted">En el mapa, toca una compañía y agrega los equipos que quieres rentar.</p>
          <Link href="/explorar" className="btn primary">Ir al mapa</Link>
        </div>
      ) : (
        companias.map((c) => (
          <TarjetaCompania
            key={c.id}
            c={c}
            pedido={pedido}
            guardar={guardar}
            dias={dias}
            ocupadas={ocupadas}
            equipo={equipo}
            conSesion={conSesion}
            onReservada={(codigo) => {
              setHechas((h) => [...h, { compania: c.nombre, codigo }]);
              setVersion((v) => v + 1);
            }}
          />
        ))
      )}
    </div>
  );
}

function TarjetaCompania({
  c,
  pedido,
  guardar,
  dias,
  ocupadas,
  equipo,
  conSesion,
  onReservada,
}: {
  c: CompaniaPublica;
  pedido: Pedido;
  guardar: GuardarPedido;
  dias: number;
  ocupadas: Record<string, number>;
  equipo: (id: string) => EquipoPublico | undefined;
  conSesion: boolean;
  onReservada: (codigo: string) => void;
}) {
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const lugar = pedido.lugar!;
  const items = pedido.rider
    .filter((i) => i.compania_id === c.id)
    .map((i) => ({ i, e: equipo(i.equipo_id) }))
    .filter((x): x is { i: (typeof pedido.rider)[number]; e: EquipoPublico } => Boolean(x.e));

  const previa = calcularCobro(c, [], dias, lugar, "entrega", false);
  const op: OpcionesCompania = pedido.opciones[c.id] ?? {
    modalidad: previa.puedeEntregar ? "entrega" : "retiro",
    tecnico: false,
    nota: "",
  };
  const modalidad = op.modalidad === "entrega" && !previa.puedeEntregar ? "retiro" : op.modalidad;
  const cobro = calcularCobro(
    c,
    items.map(({ i, e }) => ({ precio_dia: e.precio_dia, cantidad: i.cantidad })),
    dias,
    lugar,
    modalidad,
    op.tecnico,
  );
  const libres = (e: EquipoPublico) => Math.max(0, e.unidades - (ocupadas[e.id] ?? 0));
  const faltan = items.filter(({ i, e }) => i.cantidad > libres(e));
  const setOp = (cambio: Partial<OpcionesCompania>) =>
    guardar({ ...pedido, opciones: { ...pedido.opciones, [c.id]: { ...op, modalidad, ...cambio } } });

  async function solicitar() {
    setEnviando(true);
    setError("");
    const { data, error: e } = await createClient().rpc("crear_reserva", {
      p_compania: c.id,
      p_entrega: aISO(pedido.entrega),
      p_recogida: aISO(pedido.recogida),
      p_modalidad: modalidad,
      p_lugar_nombre: lugar.nombre,
      p_lugar_direccion: lugar.direccion ?? null,
      p_lat: lugar.lat,
      p_lng: lugar.lng,
      p_con_tecnico: op.tecnico,
      p_nota: op.nota || null,
      p_items: items.map(({ i }) => ({ equipo_id: i.equipo_id, cantidad: i.cantidad })),
    });
    setEnviando(false);
    if (e) {
      setError(
        e.code === "PGRST202"
          ? "Las reservas aún no están activadas: falta ejecutar el SQL 0003_reservas.sql en Supabase."
          : e.message || "No pudimos enviar la solicitud. Intenta de nuevo.",
      );
      return;
    }
    const { [c.id]: _quitada, ...resto } = pedido.opciones;
    void _quitada;
    guardar({ ...pedido, rider: pedido.rider.filter((i) => i.compania_id !== c.id), opciones: resto });
    onReservada((data as { codigo: string }).codigo);
  }

  return (
    <section className="card rider-card">
      <header className="ventana-hd">
        <div>
          <span className="fine">
            Bodega en {c.zona ?? c.ciudad} · a {textoKm(cobro.km)} del show
          </span>
          <h2>{c.nombre}</h2>
        </div>
        {c.verificada ? <span className="tag ok">✓ Verificada</span> : <span className="tag">Nueva</span>}
      </header>

      <ul className="rider-items">
        {items.map(({ i, e }) => (
          <li key={e.id}>
            <span className="eq-thumb sm">
              {e.fotos[0] ? <img src={urlFoto(e.fotos[0])} alt="" loading="lazy" /> : <span className="fine">Sin foto</span>}
            </span>
            <span className="fila-eq-txt">
              <b>{e.nombre}</b>
              <span className="fine">
                {pesos(e.precio_dia)} × {i.cantidad} × {dias} {dias === 1 ? "día" : "días"} ={" "}
                {pesos(e.precio_dia * i.cantidad * dias)}
              </span>
              {i.cantidad > libres(e) && (
                <span className="fine" style={{ color: "var(--bad)" }}>Solo quedan {libres(e)} libres en tus fechas.</span>
              )}
            </span>
            <div className="qty" role="group" aria-label={`Unidades de ${e.nombre}`}>
              <button type="button" onClick={() => guardar((p) => conCantidad(p, e.id, c.id, i.cantidad - 1))} aria-label="Una menos">
                −
              </button>
              <span aria-live="polite">{i.cantidad}</span>
              <button
                type="button"
                onClick={() => guardar((p) => conCantidad(p, e.id, c.id, i.cantidad + 1))}
                disabled={i.cantidad >= libres(e)}
                aria-label="Una más"
              >
                +
              </button>
            </div>
          </li>
        ))}
      </ul>

      <fieldset className="field">
        <legend>¿Cómo recibes los equipos?</legend>
        <div className="seg">
          <label className={previa.puedeEntregar ? "" : "inactivo"}>
            <input
              type="radio"
              name={`mod-${c.id}`}
              checked={modalidad === "entrega"}
              disabled={!previa.puedeEntregar}
              onChange={() => setOp({ modalidad: "entrega" })}
            />
            <span>
              Entrega en {lugar.nombre}
              <span className="fine">
                {previa.puedeEntregar
                  ? `${pesos(previa.transporte)} entrega y recogida`
                  : c.cobertura_km > 0
                    ? `No llega: entrega hasta ${c.cobertura_km} km`
                    : "Esta compañía no hace entregas"}
              </span>
            </span>
          </label>
          <label>
            <input type="radio" name={`mod-${c.id}`} checked={modalidad === "retiro"} onChange={() => setOp({ modalidad: "retiro" })} />
            <span>
              Recojo en la bodega
              <span className="fine">Sin costo de transporte</span>
            </span>
          </label>
        </div>
      </fieldset>
      {modalidad === "retiro" && (
        <div className="note">
          <b>Dirección de la bodega:</b> {c.direccion_bodega || "La compañía aún no la registra"}
          {c.zona ? ` · ${c.zona}` : ""}
          {c.horario_bodega ? <><br /><span className="fine">Horario: {c.horario_bodega}</span></> : null}
        </div>
      )}

      {c.tecnico_nombre && c.tecnico_tarifa_dia ? (
        <label className="switch">
          <input type="checkbox" checked={op.tecnico} onChange={(ev) => setOp({ tecnico: ev.target.checked })} />
          Agregar {c.tecnico_nombre} · {pesos(c.tecnico_tarifa_dia)} por día
        </label>
      ) : null}

      <div className="field">
        <label htmlFor={`nota-${c.id}`}>Nota para la compañía (opcional)</label>
        <textarea
          id={`nota-${c.id}`}
          rows={2}
          maxLength={1000}
          placeholder="Ej.: montaje desde las 10:00, acceso por la puerta de carga"
          value={op.nota}
          onChange={(ev) => setOp({ nota: ev.target.value })}
        />
      </div>

      <dl className="cobro">
        <div><dt>Alquiler ({dias} {dias === 1 ? "día" : "días"})</dt><dd>{pesos(cobro.alquiler)}</dd></div>
        <div><dt>Transporte</dt><dd>{modalidad === "retiro" ? "Recoges tú · $ 0" : pesos(cobro.transporte)}</dd></div>
        {cobro.tecnico > 0 && <div><dt>Técnico</dt><dd>{pesos(cobro.tecnico)}</dd></div>}
        <div><dt>Tarifa de servicio ENRENTA ({Math.round(SERVICIO * 100)} %)</dt><dd>{pesos(cobro.servicio)}</dd></div>
        <div><dt>Depósito reembolsable ({c.deposito_pct} %)</dt><dd>{pesos(cobro.deposito)}</dd></div>
        <div className="total"><dt>Total</dt><dd>{pesos(cobro.total)}</dd></div>
      </dl>
      <p className="fine">
        El depósito se devuelve al cerrar la entrega sin novedades. La compañía debe aceptar la solicitud; todavía no se
        cobra nada (los pagos llegan en un siguiente paso).
      </p>

      {error && <p className="form-err" role="alert">{error}</p>}
      {conSesion ? (
        <button type="button" className="btn primary lg block" onClick={solicitar} disabled={enviando || faltan.length > 0 || !items.length}>
          {enviando ? "Enviando solicitud…" : `Solicitar reserva a ${c.nombre}`}
        </button>
      ) : (
        <Link href="/necesito" className="btn primary lg block">Entra con tu correo para reservar</Link>
      )}
    </section>
  );
}
