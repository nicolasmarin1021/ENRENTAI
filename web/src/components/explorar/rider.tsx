"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconoCategoria } from "@/components/iconos";
import type { Catalogo, CompaniaPublica, EquipoPublico } from "@/lib/catalogo-publico";
import { calcularCobro, SERVICIO } from "@/lib/cobro";
import { useOcupadas } from "@/lib/disponibilidad";
import { textoKm } from "@/lib/geo";
import { pesos } from "@/lib/medellin";
import {
  aISO,
  conCantidad,
  diasDeRenta,
  usePedido,
  type GuardarPedido,
  type ItemRider,
  type OpcionesCompania,
  type Pedido,
} from "@/lib/pedido";
import { createClient } from "@/lib/supabase/client";
import { BotonPDF } from "../boton-pdf";
import { HORAS } from "./pasos";
import { FichaEquipo, type Rider } from "./vista-mapa";

type Linea = { i: ItemRider; e: EquipoPublico };
type Grupo = { c: CompaniaPublica; lineas: Linea[]; op: OpcionesCompania; modalidad: "entrega" | "retiro"; cobro: ReturnType<typeof calcularCobro> };
type Resultado = { compania: string; codigo?: string; error?: string };

const fechaLarga = (s: string) =>
  new Intl.DateTimeFormat("es-CO", { weekday: "short", day: "numeric", month: "short" }).format(new Date(s)).replace(".", "");

// Tu rider: la lista de equipos para un show. Cada compañía recibe su propia solicitud.
export function RiderVista({
  catalogo,
  conSesion,
  nombreCliente,
}: {
  catalogo: Catalogo;
  conSesion: boolean;
  nombreCliente: string;
}) {
  const router = useRouter();
  const [pedido, guardar] = usePedido();
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [version, setVersion] = useState(0); // recarga la disponibilidad tras reservar
  const [ficha, setFicha] = useState<EquipoPublico | null>(null);
  const ocupadas = useOcupadas(pedido.entrega, pedido.recogida, version);
  const dias = diasDeRenta(pedido.entrega, pedido.recogida);
  const lugar = pedido.lugar;
  const listo = lugar !== null && dias > 0;

  const todos = catalogo.companias.flatMap((c) => c.equipos);
  const equipo = (id: string) => todos.find((e) => e.id === id);
  const libres = (e: EquipoPublico) => Math.max(0, e.unidades - (ocupadas[e.id] ?? 0));
  const huerfanos = pedido.rider.filter((i) => !equipo(i.equipo_id));
  const riderFicha: Rider = {
    libres,
    enRider: (e) => pedido.rider.find((i) => i.equipo_id === e.id)?.cantidad ?? 0,
    cambiar: (e, n) => guardar((p) => conCantidad(p, e.id, e.compania_id, n)),
  };

  const grupos: Grupo[] = !listo
    ? []
    : [...new Set(pedido.rider.map((i) => i.compania_id))]
        .map((id) => catalogo.companias.find((c) => c.id === id))
        .filter((c): c is CompaniaPublica => Boolean(c))
        .map((c) => {
          const lineas = pedido.rider
            .filter((i) => i.compania_id === c.id)
            .map((i) => ({ i, e: equipo(i.equipo_id) }))
            .filter((x): x is Linea => Boolean(x.e));
          const puede = calcularCobro(c, [], dias, lugar!, "entrega", false).puedeEntregar;
          const op = pedido.opciones[c.id] ?? { modalidad: puede ? "entrega" : "retiro", tecnico: false, nota: "" };
          const modalidad = op.modalidad === "entrega" && !puede ? "retiro" : op.modalidad;
          const cobro = calcularCobro(
            c,
            lineas.map(({ i, e }) => ({ precio_dia: e.precio_dia, cantidad: i.cantidad })),
            dias,
            lugar!,
            modalidad,
            op.tecnico,
          );
          return { c, lineas, op, modalidad, cobro };
        });

  const unidades = pedido.rider.reduce((a, i) => a + i.cantidad, 0);
  const suma = (k: "alquiler" | "transporte" | "tecnico" | "servicio" | "deposito" | "total") =>
    grupos.reduce((a, g) => a + g.cobro[k], 0);
  const faltan = grupos.some((g) => g.lineas.some(({ i, e }) => i.cantidad > libres(e)));

  async function enviar() {
    setEnviando(true);
    const res: Resultado[] = [];
    const supabase = createClient();
    for (const g of grupos) {
      const { data, error } = await supabase.rpc("crear_reserva", {
        p_compania: g.c.id,
        p_entrega: aISO(pedido.entrega),
        p_recogida: aISO(pedido.recogida),
        p_modalidad: g.modalidad,
        p_lugar_nombre: lugar!.nombre,
        p_lugar_direccion: lugar!.direccion ?? null,
        p_lat: lugar!.lat,
        p_lng: lugar!.lng,
        p_con_tecnico: g.op.tecnico,
        p_nota: pedido.nota.trim() || null,
        p_items: g.lineas.map(({ i }) => ({ equipo_id: i.equipo_id, cantidad: i.cantidad })),
      });
      if (error) {
        res.push({
          compania: g.c.nombre,
          error:
            error.code === "PGRST202"
              ? "Las reservas aún no están activadas (falta el SQL 0003_reservas.sql)."
              : error.message || "No pudimos enviar la solicitud.",
        });
      } else {
        res.push({ compania: g.c.nombre, codigo: (data as { codigo: string }).codigo });
        // Solo salen del rider los equipos de las compañías que sí recibieron la solicitud.
        guardar((p) => {
          const { [g.c.id]: _fuera, ...opciones } = p.opciones;
          void _fuera;
          return { ...p, rider: p.rider.filter((i) => i.compania_id !== g.c.id), opciones };
        });
      }
    }
    setResultados(res);
    setEnviando(false);
    setVersion((v) => v + 1);
    router.refresh(); // actualiza los contadores de las pestañas
  }

  const setFecha = (cual: "entrega" | "recogida", fecha: string, hora: string) =>
    guardar((p) => ({ ...p, [cual]: fecha ? `${fecha}T${hora || "10:00"}` : "" }));
  const [fe, he] = (pedido.entrega || "T").split("T");
  const [fr, hr] = (pedido.recogida || "T").split("T");

  return (
    <section className="rider-pagina">
      <div className="page-hd">
        <div>
          <h1 className="title-lg">Tu rider</h1>
          <p className="muted">
            {grupos.length
              ? `${unidades} ${unidades === 1 ? "unidad" : "unidades"} de ${grupos.length} ${grupos.length === 1 ? "compañía" : "compañías"} para ${lugar?.nombre}. Cada compañía recibe su propia solicitud.`
              : "Aquí armas la lista de equipos para un show. Cada compañía recibe su propia solicitud."}
          </p>
        </div>
      </div>

      {resultados.map((r) =>
        r.codigo ? (
          <p key={r.compania} className="form-ok" role="status">
            Solicitud <b>{r.codigo}</b> enviada a {r.compania}. Te avisamos cuando responda.{" "}
            <Link href="/necesito/reservas">Ver mis reservas</Link>
          </p>
        ) : (
          <p key={r.compania} className="form-err" role="alert">
            {r.compania}: {r.error}
          </p>
        ),
      )}

      {huerfanos.length > 0 && (
        <div className="note">
          {huerfanos.length === 1
            ? "Un equipo de tu rider ya no está publicado."
            : `${huerfanos.length} equipos de tu rider ya no están publicados.`}{" "}
          <button
            type="button"
            className="link-btn"
            onClick={() => guardar((p) => ({ ...p, rider: p.rider.filter((i) => equipo(i.equipo_id)) }))}
          >
            Quitarlos
          </button>
        </div>
      )}

      {!listo ? (
        <div className="card empty-rider">
          <p className="muted">Primero cuéntanos qué necesitas, cuándo y dónde es el show.</p>
          <Link href="/explorar" className="btn primary">Buscar equipos</Link>
        </div>
      ) : (
        <>
          <section className="card rider-evento" aria-label="Lugar y fechas del show">
            <div className="field">
              <label htmlFor="rd-lugar">Lugar del show</label>
              <select
                id="rd-lugar"
                value={lugar!.id ?? "propio"}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "otro") return router.push("/explorar?paso=3");
                  const l = catalogo.lugares.find((x) => x.id === v);
                  if (l) guardar((p) => ({ ...p, lugar: { id: l.id, nombre: l.nombre, direccion: l.direccion ?? undefined, lat: l.lat, lng: l.lng } }));
                }}
              >
                {!lugar!.id && <option value="propio">{lugar!.nombre}</option>}
                {catalogo.lugares.map((l) => (
                  <option key={l.id} value={l.id}>{l.nombre}</option>
                ))}
                <option value="otro">+ Otro lugar (escribir dirección)</option>
              </select>
            </div>
            <fieldset className="field">
              <legend>Entrega (montaje)</legend>
              <div className="fecha-hora">
                <input type="date" aria-label="Fecha de entrega" value={fe} onChange={(e) => setFecha("entrega", e.target.value, he)} />
                <select aria-label="Hora de entrega" value={he} onChange={(e) => setFecha("entrega", fe, e.target.value)}>
                  {HORAS.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            </fieldset>
            <fieldset className="field">
              <legend>Recogida (desmontaje)</legend>
              <div className="fecha-hora">
                <input type="date" aria-label="Fecha de recogida" min={fe} value={fr} onChange={(e) => setFecha("recogida", e.target.value, hr)} />
                <select aria-label="Hora de recogida" value={hr} onChange={(e) => setFecha("recogida", fr, e.target.value)}>
                  {HORAS.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            </fieldset>
          </section>

          {grupos.length === 0 ? (
            <div className="card empty-rider">
              <p className="muted">Tu rider está vacío.</p>
              <Link href="/explorar" className="btn primary">Buscar equipos</Link>
            </div>
          ) : (
            <div className="rider-grid">
              <div className="rider-col">
                {grupos.map((g) => (
                  <TarjetaCompania key={g.c.id} g={g} pedido={pedido} guardar={guardar} dias={dias} libres={libres} onFicha={setFicha} />
                ))}
              </div>

              <aside className="card rider-resumen" aria-label="Resumen">
                <h2>Resumen</h2>
                <p className="fine">
                  Se cobra un día por cada 24 horas entre la entrega y la recogida: el día adicional solo se cobra si la
                  renta supera las 24 horas.
                </p>
                <dl className="cobro">
                  <div><dt>Alquiler de equipos ({dias} {dias === 1 ? "día" : "días"})</dt><dd>{pesos(suma("alquiler"))}</dd></div>
                  <div><dt>Entrega y recogida</dt><dd>{pesos(suma("transporte"))}</dd></div>
                  <div><dt>Técnicos</dt><dd>{pesos(suma("tecnico"))}</dd></div>
                  <div><dt>Tarifa de servicio ({Math.round(SERVICIO * 100)} %)</dt><dd>{pesos(suma("servicio"))}</dd></div>
                  <div><dt>Depósito reembolsable</dt><dd>{pesos(suma("deposito"))}</dd></div>
                  <div className="total"><dt>Total</dt><dd>{pesos(suma("total"))}</dd></div>
                </dl>

                <div className="field">
                  <span className="etiqueta">¿Necesitas una cotización formal antes de reservar?</span>
                  <div className="row-actions">
                    {grupos.map((g) => (
                      <BotonPDF
                        key={g.c.id}
                        className="btn sm"
                        texto={grupos.length > 1 ? `Cotización · ${g.c.nombre}` : "Cotización en PDF"}
                        datos={{
                          tipo: "cotizacion",
                          cliente: { nombre: nombreCliente },
                          compania: { nombre: g.c.nombre, zona: g.c.zona, direccionBodega: g.c.direccion_bodega, horario: g.c.horario_bodega },
                          evento: {
                            lugar: lugar!.nombre,
                            direccion: lugar!.direccion ?? null,
                            entrega: aISO(pedido.entrega),
                            recogida: aISO(pedido.recogida),
                            dias,
                            modalidad: g.modalidad,
                            distanciaKm: g.cobro.km,
                          },
                          items: g.lineas.map(({ i, e }) => ({ nombre: e.nombre, cantidad: i.cantidad, precioDia: e.precio_dia })),
                          tecnico: g.cobro.tecnico > 0 ? { nombre: g.c.tecnico_nombre ?? "Técnico", valor: g.cobro.tecnico } : null,
                          cobro: {
                            alquiler: g.cobro.alquiler,
                            transporte: g.cobro.transporte,
                            tecnico: g.cobro.tecnico,
                            servicio: g.cobro.servicio,
                            depositoPct: g.c.deposito_pct,
                            deposito: g.cobro.deposito,
                            total: g.cobro.total,
                          },
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="rd-nota">Nota para las compañías</label>
                  <textarea
                    id="rd-nota"
                    rows={2}
                    maxLength={1000}
                    placeholder="Ej.: montaje desde las 10:00, acceso por la puerta de carga"
                    value={pedido.nota}
                    onChange={(e) => {
                      const v = e.target.value;
                      guardar((p) => ({ ...p, nota: v }));
                    }}
                  />
                </div>

                {conSesion ? (
                  <button type="button" className="btn primary lg block" onClick={enviar} disabled={enviando || faltan}>
                    {enviando
                      ? "Enviando…"
                      : `Enviar ${grupos.length === 1 ? "la solicitud" : `${grupos.length} solicitudes`}`}
                  </button>
                ) : (
                  <Link href="/necesito" className="btn primary lg block">Entra con tu correo para reservar</Link>
                )}
                <p className="fine">
                  {faltan
                    ? "Ajusta las cantidades marcadas: no hay tantas unidades libres en tus fechas."
                    : "Todavía no se cobra nada: el pago en garantía llega en un siguiente paso."}
                </p>

                <div className="como-funciona">
                  <b>Cómo funciona una reserva</b>
                  <ol>
                    <li>Envías la solicitud y las unidades quedan apartadas mientras la compañía responde.</li>
                    <li>La compañía acepta o rechaza. Si rechaza, las unidades se liberan.</li>
                    <li>Entrega en el lugar (o retiro en bodega) con registro fotográfico.</li>
                    <li>Al devolver, la compañía revisa el equipo y se te devuelve el depósito.</li>
                  </ol>
                </div>
              </aside>
            </div>
          )}
        </>
      )}

      {ficha && (
        <FichaEquipo
          e={ficha}
          compania={catalogo.companias.find((c) => c.id === ficha.compania_id)?.nombre ?? ""}
          dias={dias}
          rider={riderFicha}
          nombreCat={(id) => id}
          onCerrar={() => setFicha(null)}
        />
      )}
    </section>
  );
}

function TarjetaCompania({
  g,
  pedido,
  guardar,
  dias,
  libres,
  onFicha,
}: {
  g: Grupo;
  pedido: Pedido;
  guardar: GuardarPedido;
  dias: number;
  libres: (e: EquipoPublico) => number;
  onFicha: (e: EquipoPublico) => void;
}) {
  const { c, lineas, op, modalidad, cobro } = g;
  const lugar = pedido.lugar!;
  const setOp = (cambio: Partial<OpcionesCompania>) =>
    guardar((p) => ({ ...p, opciones: { ...p.opciones, [c.id]: { ...op, modalidad, ...cambio } } }));
  const cambiar = (e: EquipoPublico, n: number) => guardar((p) => conCantidad(p, e.id, c.id, n));

  return (
    <section className="card rider-grupo" aria-label={c.nombre}>
      <header className="rg-hd">
        <div>
          <h2>{c.nombre}</h2>
          <span className="fine">
            {c.zona ?? c.ciudad} · a {textoKm(cobro.km)} del show ·{" "}
            {c.verificada ? <span className="ok-txt">✓ Verificada</span> : "Nueva en ENRENTA"}
          </span>
        </div>
        <b className="rg-total">{pesos(cobro.alquiler + cobro.transporte + cobro.tecnico)}</b>
      </header>

      <ul className="rg-items">
        {lineas.map(({ i, e }) => {
          const l = libres(e);
          return (
            <li key={e.id} className={i.cantidad > l ? "falta" : ""}>
              <span className="pi-ico">
                <IconoCategoria cat={e.categoria_id} size={19} />
              </span>
              <span className="rg-txt">
                <b>{e.nombre}</b>
                <span className="fine">
                  {pesos(e.precio_dia)} por día
                  {e.banda_nombre ? ` · ${e.banda_nombre}` : ""}
                  {i.cantidad > l ? ` · solo quedan ${l} libres` : ""}
                </span>
                <button type="button" className="link-btn" onClick={() => onFicha(e)}>
                  Fotos y ficha
                </button>
              </span>
              <div className="qty" role="group" aria-label={`Unidades de ${e.nombre}`}>
                <button type="button" onClick={() => cambiar(e, i.cantidad - 1)} aria-label="Una menos">
                  −
                </button>
                <span aria-live="polite">{i.cantidad}</span>
                <button type="button" onClick={() => cambiar(e, i.cantidad + 1)} disabled={i.cantidad >= l} aria-label="Una más">
                  +
                </button>
              </div>
              <span className="rg-linea">
                <small>
                  {i.cantidad} × {dias} {dias === 1 ? "día" : "días"}
                </small>
                {pesos(e.precio_dia * i.cantidad * dias)}
              </span>
              <button type="button" className="cerrar sm" onClick={() => cambiar(e, 0)} aria-label={`Quitar ${e.nombre}`}>
                ×
              </button>
            </li>
          );
        })}
      </ul>

      <fieldset className="field rg-opciones">
        <legend>¿Cómo recibes y devuelves el equipo?</legend>
        <div className="seg">
          <label className={cobro.puedeEntregar ? "" : "inactivo"}>
            <input
              type="radio"
              name={`mod-${c.id}`}
              checked={modalidad === "entrega"}
              disabled={!cobro.puedeEntregar}
              onChange={() => setOp({ modalidad: "entrega" })}
            />
            <span>
              Entrega y recogida en {lugar.nombre}
              <span className="fine">
                {cobro.puedeEntregar
                  ? `${pesos(calcularCobro(c, [], dias, lugar, "entrega", false).transporte)} · ${c.transporte_modo === "fijo" ? "tarifa fija de la compañía" : "según la distancia"}`
                  : c.cobertura_km > 0
                    ? `No llega: entrega hasta ${c.cobertura_km} km`
                    : "Esta compañía no hace entregas"}
              </span>
            </span>
          </label>
          <label>
            <input type="radio" name={`mod-${c.id}`} checked={modalidad === "retiro"} onChange={() => setOp({ modalidad: "retiro" })} />
            <span>
              Lo recojo y lo devuelvo en su bodega
              <span className="fine">Sin costo de entrega ni recogida</span>
            </span>
          </label>
        </div>
      </fieldset>
      {modalidad === "retiro" && (
        <p className="note">
          <b>Bodega:</b> {c.direccion_bodega || "La compañía aún no la registra"}
          {c.zona ? ` · ${c.zona}` : ""}
          {c.horario_bodega ? ` · ${c.horario_bodega}` : ""}
        </p>
      )}
      {c.tecnico_nombre && c.tecnico_tarifa_dia ? (
        <label className="switch rg-tecnico">
          <input type="checkbox" checked={op.tecnico} onChange={(ev) => setOp({ tecnico: ev.target.checked })} />
          <span>
            {c.tecnico_nombre}
            <span className="fine">
              {pesos(c.tecnico_tarifa_dia)} por día · {pesos(c.tecnico_tarifa_dia * dias)} en total
            </span>
          </span>
        </label>
      ) : null}
      <p className="fine">
        {fechaLarga(pedido.entrega)}, {pedido.entrega.split("T")[1]} → {fechaLarga(pedido.recogida)}, {pedido.recogida.split("T")[1]} ·{" "}
        {dias} {dias === 1 ? "día cobrado" : "días cobrados"}
      </p>
    </section>
  );
}
