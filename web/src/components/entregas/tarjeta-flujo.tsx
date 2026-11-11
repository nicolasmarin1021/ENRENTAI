"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { ESTADOS_RESERVA } from "@/lib/cobro";
import {
  MIN_FOTOS_PASO,
  PASOS,
  TIPOS_CASO,
  pasoDisponible,
  type CasoVista,
  type Flujo,
  type Lado,
  type Paso,
} from "@/lib/entregas";
import { fechaCO, pesos, rangoCO } from "@/lib/medellin";
import { createClient } from "@/lib/supabase/client";
import {
  Miniaturas,
  SelectorFotos,
  VisorFotos,
  mensajeError,
  subirFotos,
  useFotosLocales,
  type Visor,
} from "./fotos";

const MAX_FOTOS = 12;

// Los 4 pasos del proceso, como guía arriba de la lista.
export function TiraPasos() {
  return (
    <ol className="flow-strip" aria-label="Pasos del proceso">
      {PASOS.map((p, i) => (
        <li key={p.k}>
          <span className="fs-n" aria-hidden="true">
            {i + 1}
          </span>
          <span>
            <b>{p.titulo}</b>
            <span className="fine">{p.quien === "cliente" ? "Cliente" : "Compañía"} · fotos y lista de chequeo</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

type Modal = { tipo: "paso"; paso: Paso } | { tipo: "caso" } | null;

// Una reserva con sus 4 pasos de entrega, sus casos y las ventanas para registrarlos.
export function TarjetaFlujo({ f, lado, ahora, enlace = true }: { f: Flujo; lado: Lado; ahora: number; enlace?: boolean }) {
  const router = useRouter();
  const est = ESTADOS_RESERVA[f.estado] ?? { texto: f.estado, tono: "" };
  const hecha = (p: Paso) => f.actas.find((a) => a.paso === p);
  const abiertos = f.casos.filter((c) => c.estado === "abierto").length;
  const deposito =
    abiertos > 0
      ? { tono: "warn", texto: `Depósito retenido (${pesos(f.deposito)}): ${abiertos === 1 ? "hay un caso abierto" : `hay ${abiertos} casos abiertos`}.` }
      : f.estado === "completada"
        ? { tono: "ok", texto: `Reserva cerrada: el depósito (${pesos(f.deposito)}) se devuelve al cliente.` }
        : { tono: "", texto: `Depósito en garantía (${pesos(f.deposito)}) hasta la revisión final.` };

  // Ventana para registrar un paso o abrir un caso.
  const ventana = useRef<HTMLDialogElement>(null);
  const [modal, setModal] = useState<Modal>(null);
  const fotos = useFotosLocales(MAX_FOTOS);
  const [marcados, setMarcados] = useState<string[]>([]);
  const [nota, setNota] = useState("");
  const [tipoCaso, setTipoCaso] = useState("dano");
  const [descripcion, setDescripcion] = useState("");
  const [progreso, setProgreso] = useState("");
  const [error, setError] = useState("");
  const ocupado = progreso !== "";

  // Visor de fotos.
  const visorRef = useRef<HTMLDialogElement>(null);
  const [visor, setVisor] = useState<Visor | null>(null);
  const abrirVisor = (lista: string[], i: number, titulo: string) => {
    setVisor({ fotos: lista, i, titulo });
    visorRef.current?.showModal();
  };

  function abrir(m: NonNullable<Modal>) {
    fotos.vaciar();
    setMarcados([]);
    setNota("");
    setTipoCaso("dano");
    setDescripcion("");
    setError("");
    setProgreso("");
    setModal(m);
    ventana.current?.showModal();
  }
  const cerrar = () => ventana.current?.close();

  async function registrarPaso(e: FormEvent, paso: Paso) {
    e.preventDefault();
    const def = PASOS.find((p) => p.k === paso)!;
    if (fotos.fotos.length < MIN_FOTOS_PASO) return setError(`Agrega al menos ${MIN_FOTOS_PASO} fotos del equipo.`);
    if (marcados.length < def.checks.length)
      return setError("Marca toda la lista de chequeo. Si algo no está bien, usa «Hay una novedad».");
    setError("");
    try {
      const supabase = createClient();
      setProgreso(`Subiendo ${fotos.fotos.length} fotos…`);
      const rutas = await subirFotos(supabase, `${f.id}/${paso}`, fotos.fotos);
      setProgreso("Guardando…");
      const { error: err } = await supabase.rpc("registrar_acta", {
        p_reserva: f.id,
        p_paso: paso,
        p_checks: def.checks,
        p_nota: nota.trim() || null,
        p_fotos: rutas,
        p_lado: lado,
      });
      if (err) throw err;
    } catch (err) {
      setProgreso("");
      setError(mensajeError(err, "No pudimos registrar este paso. Intenta de nuevo."));
      return;
    }
    setProgreso("");
    cerrar();
    router.refresh();
  }

  async function abrirCaso(e: FormEvent) {
    e.preventDefault();
    if (descripcion.trim().length < 10) return setError("Cuéntanos qué pasó (al menos 10 caracteres).");
    setError("");
    try {
      const supabase = createClient();
      let rutas: string[] = [];
      if (fotos.fotos.length) {
        setProgreso(`Subiendo ${fotos.fotos.length} ${fotos.fotos.length === 1 ? "foto" : "fotos"}…`);
        rutas = await subirFotos(supabase, `${f.id}/casos`, fotos.fotos);
      }
      setProgreso("Abriendo el caso…");
      const { error: err } = await supabase.rpc("abrir_caso", {
        p_reserva: f.id,
        p_tipo: tipoCaso,
        p_descripcion: descripcion.trim(),
        p_fotos: rutas,
        p_lado: lado,
      });
      if (err) throw err;
    } catch (err) {
      setProgreso("");
      setError(mensajeError(err, "No pudimos abrir el caso. Intenta de nuevo."));
      return;
    }
    setProgreso("");
    cerrar();
    router.refresh();
  }

  const hrefReserva = lado === "compania" ? `/reservas/${f.id}?de=tengo` : `/reservas/${f.id}`;

  return (
    <article className="card flujo" id={`fl-${f.id}`}>
      <header className="flujo-hd">
        <span className="code">{f.codigo}</span>
        <span className={`tag ${est.tono}`}>{est.texto}</span>
        <div className="flujo-quien">
          <b>{f.contraparte}</b>
          <span className="fine">
            {f.lugar} · {rangoCO(f.entrega, f.recogida)}
          </span>
        </div>
        {enlace && (
          <Link href={hrefReserva} className="link-btn">
            Ver reserva
          </Link>
        )}
      </header>
      <p className={`deposito-estado ${deposito.tono}`}>{deposito.texto}</p>

      <ol className="fsteps" aria-label="Pasos de la entrega">
        {PASOS.map((p, i) => {
          const a = hecha(p.k);
          const disponible = pasoDisponible(f, p.k, ahora);
          const meToca = disponible && p.quien === lado;
          let espera = "Más adelante";
          if (f.estado === "completada") espera = "No registrado";
          else if (p.k === "revision" && hecha("salida") && !hecha("devolucion"))
            espera = `Al registrar la devolución o desde ${fechaCO(f.recogida)}`;
          else if (p.k === "devolucion" && hecha("salida") && !hecha("recepcion")) espera = "Después de la recepción";
          return (
            <li key={p.k} className={`fs${a ? " done" : ""}${meToca ? " turn" : ""}`}>
              <span className="fs-n" aria-hidden="true">
                {a ? "✓" : i + 1}
              </span>
              <div className="fs-body">
                <b>{p.titulo}</b>
                {a ? (
                  <>
                    <span className="fs-ok">✓ {fechaCO(a.creado)}</span>
                    <span className="fine">{a.autor_nombre}</span>
                    <Miniaturas
                      fotos={a.fotos}
                      etiqueta={p.titulo}
                      onAbrir={(k) => abrirVisor(a.fotos, k, `${f.codigo} · ${p.titulo}`)}
                    />
                    {a.nota && <span className="fs-nota">“{a.nota}”</span>}
                  </>
                ) : meToca ? (
                  <>
                    <span className="fs-turn">Te toca</span>
                    <button type="button" className="btn primary sm" onClick={() => abrir({ tipo: "paso", paso: p.k })}>
                      {p.verbo}
                    </button>
                  </>
                ) : disponible ? (
                  <span className="fine">Pendiente: {p.quien === "cliente" ? "el cliente" : "la compañía"}</span>
                ) : (
                  <span className="fine">{espera}</span>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {f.casos.length > 0 && (
        <div className="casos-flujo" aria-label="Casos">
          {f.casos.map((c) => (
            <TarjetaCaso key={c.id} c={c} lado={lado} onFoto={(k) => abrirVisor(c.fotos, k, `Caso ${c.codigo}`)} />
          ))}
        </div>
      )}

      <footer className="flujo-ft">
        <span className="fine">{f.items.map((i) => `${i.cantidad}× ${i.nombre}`).join(", ")}</span>
        <button type="button" className="btn sm" onClick={() => abrir({ tipo: "caso" })}>
          Abrir un caso
        </button>
      </footer>

      <dialog
        ref={ventana}
        className="ficha modal"
        aria-label={modal?.tipo === "caso" ? "Abrir un caso" : "Registrar paso"}
        onClose={() => {
          setModal(null);
          fotos.vaciar();
        }}
        onCancel={(e) => ocupado && e.preventDefault()}
      >
        {modal?.tipo === "paso" &&
          (() => {
            const def = PASOS.find((p) => p.k === modal.paso)!;
            const idx = PASOS.indexOf(def) + 1;
            const bloqueada = modal.paso === "revision" && abiertos > 0;
            return (
              <form className="dlg" onSubmit={(e) => registrarPaso(e, modal.paso)} noValidate>
                <header className="dlg-hd">
                  <div>
                    <span className="fine">
                      {f.codigo} · paso {idx} de 4
                    </span>
                    <h2>{def.titulo}</h2>
                    <p className="fine">{def.desc}</p>
                  </div>
                  <button type="button" className="cerrar" aria-label="Cerrar" onClick={cerrar} disabled={ocupado}>
                    ×
                  </button>
                </header>
                <div className="dlg-body">
                  <div className="field">
                    <span className="etiqueta">Lo que debe estar</span>
                    <ul className="items-paso">
                      {f.items.map((it, k) => (
                        <li key={k}>
                          <span className="cant">{it.cantidad}×</span>
                          {it.nombre}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="field">
                    <span className="etiqueta">Fotos (mínimo {MIN_FOTOS_PASO})</span>
                    <span className="hint">Fotografía el equipo completo, las cantidades y cualquier detalle.</span>
                    <SelectorFotos estado={fotos} disabled={ocupado} />
                  </div>
                  <fieldset className="field">
                    <legend>Lista de chequeo</legend>
                    <div className="checks">
                      {def.checks.map((c) => (
                        <label key={c} className="switch">
                          <input
                            type="checkbox"
                            checked={marcados.includes(c)}
                            disabled={ocupado}
                            onChange={(e) => setMarcados((m) => (e.target.checked ? [...m, c] : m.filter((x) => x !== c)))}
                          />
                          {c}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <div className="field">
                    <label htmlFor={`nota-${f.id}`}>Observaciones (opcional)</label>
                    <textarea
                      id={`nota-${f.id}`}
                      rows={2}
                      maxLength={1000}
                      value={nota}
                      onChange={(e) => setNota(e.target.value)}
                      disabled={ocupado}
                    />
                  </div>
                  {modal.paso === "revision" && !hecha("devolucion") && (
                    <p className="aviso-banda">
                      El cliente no registró fotos de devolución. Tus fotos serán el único registro de cómo volvió el equipo.
                    </p>
                  )}
                  {bloqueada && (
                    <p className="aviso-banda">
                      {abiertos === 1 ? "Hay un caso abierto" : `Hay ${abiertos} casos abiertos`} en esta reserva. Resuélvelos
                      antes de cerrar la revisión final; mientras tanto el depósito queda retenido.
                    </p>
                  )}
                  {error && (
                    <p className="form-err" role="alert">
                      {error}
                    </p>
                  )}
                </div>
                <footer className="dlg-ft">
                  <button
                    type="button"
                    className="btn danger"
                    disabled={ocupado}
                    onClick={() => {
                      setModal({ tipo: "caso" });
                      setError("");
                    }}
                  >
                    Hay una novedad
                  </button>
                  <span className="grow" />
                  <button type="button" className="btn" onClick={cerrar} disabled={ocupado}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn primary" disabled={ocupado || bloqueada}>
                    {progreso || def.verbo}
                  </button>
                </footer>
              </form>
            );
          })()}

        {modal?.tipo === "caso" && (
          <form className="dlg" onSubmit={abrirCaso} noValidate>
            <header className="dlg-hd">
              <div>
                <span className="fine">
                  {f.codigo} · {f.contraparte}
                </span>
                <h2>Abrir un caso</h2>
                <p className="fine">
                  Cuéntanos qué pasó. ENRENTA revisa las fotos de cada paso y te ayuda a resolverlo con la otra parte.
                </p>
              </div>
              <button type="button" className="cerrar" aria-label="Cerrar" onClick={cerrar} disabled={ocupado}>
                ×
              </button>
            </header>
            <div className="dlg-body">
              <div className="field">
                <label htmlFor={`caso-tipo-${f.id}`}>Tipo de novedad</label>
                <select id={`caso-tipo-${f.id}`} value={tipoCaso} onChange={(e) => setTipoCaso(e.target.value)} disabled={ocupado}>
                  {Object.entries(TIPOS_CASO).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor={`caso-desc-${f.id}`}>Qué pasó</label>
                <textarea
                  id={`caso-desc-${f.id}`}
                  rows={3}
                  maxLength={2000}
                  placeholder="Ej.: llegaron 7 de los 8 micrófonos; falta el número 8."
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  disabled={ocupado}
                />
              </div>
              <div className="field">
                <span className="etiqueta">Fotos de la novedad (opcional)</span>
                <span className="hint">Las fotos ayudan a resolverlo más rápido.</span>
                <SelectorFotos estado={fotos} disabled={ocupado} />
              </div>
              <p className="aviso-banda">
                Mientras el caso esté abierto, el depósito queda retenido y la compañía no puede cerrar la reserva.
              </p>
              {error && (
                <p className="form-err" role="alert">
                  {error}
                </p>
              )}
            </div>
            <footer className="dlg-ft">
              <span className="grow" />
              <button type="button" className="btn" onClick={cerrar} disabled={ocupado}>
                Cancelar
              </button>
              <button type="submit" className="btn danger solid" disabled={ocupado}>
                {progreso || "Abrir caso"}
              </button>
            </footer>
          </form>
        )}
      </dialog>

      <VisorFotos
        ref={visorRef}
        visor={visor}
        onCerrar={() => setVisor(null)}
        onMover={(d) => setVisor((v) => (v ? { ...v, i: Math.min(Math.max(v.i + d, 0), v.fotos.length - 1) } : v))}
      />
    </article>
  );
}

// Un caso con su historial, respuestas y el botón para marcarlo como resuelto.
function TarjetaCaso({ c, lado, onFoto }: { c: CasoVista; lado: Lado; onFoto: (i: number) => void }) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [error, setError] = useState("");
  const abierto = c.estado === "abierto";

  async function llamar(fn: "comentar_caso" | "resolver_caso") {
    setOcupado(true);
    setError("");
    const args =
      fn === "comentar_caso" ? { p_caso: c.id, p_texto: texto.trim(), p_lado: lado } : { p_caso: c.id, p_lado: lado };
    const { error: e } = await createClient().rpc(fn, args);
    setOcupado(false);
    if (e) return setError(mensajeError(e, "No pudimos guardar. Intenta de nuevo."));
    setTexto("");
    setConfirmar(false);
    router.refresh();
  }

  return (
    <div className={`caso-f${abierto ? " abierto" : ""}`}>
      <div className="caso-hd">
        <span className={`tag sm ${abierto ? "warn" : "ok"}`}>{abierto ? "Caso abierto" : "Resuelto"}</span>
        <b>{TIPOS_CASO[c.tipo] ?? c.tipo}</b>
        <span className="fine">
          {c.codigo} · {c.abierto_por_nombre} · {fechaCO(c.creado)}
        </span>
      </div>
      <p>{c.descripcion}</p>
      <Miniaturas fotos={c.fotos} etiqueta={`el caso ${c.codigo}`} max={4} onAbrir={onFoto} />
      <ol className="tl">
        <li>
          <time>{fechaCO(c.creado)} · ENRENTA</time>
          Recibimos el caso. Revisamos las fotos de cada paso y les ayudamos a resolverlo. Mientras esté abierto, el depósito
          queda retenido.
        </li>
        {c.mensajes.map((m, k) => (
          <li key={k}>
            <time>
              {fechaCO(m.creado)} · {m.autor_nombre}
            </time>
            {m.texto}
          </li>
        ))}
        {!abierto && (
          <li>
            <time>
              {c.resuelto ? fechaCO(c.resuelto) : ""} · {c.resuelto_por_nombre ?? "ENRENTA"}
            </time>
            Caso marcado como resuelto.
          </li>
        )}
      </ol>
      {abierto && (
        <div className="caso-resp">
          <label className="sr-only" htmlFor={`resp-${c.id}`}>
            Actualización del caso {c.codigo}
          </label>
          <input
            id={`resp-${c.id}`}
            placeholder="Escribe una actualización…"
            maxLength={2000}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            disabled={ocupado}
          />
          <button type="button" className="btn sm" onClick={() => llamar("comentar_caso")} disabled={ocupado || !texto.trim()}>
            Enviar
          </button>
          {confirmar ? (
            <>
              <button type="button" className="btn primary sm" onClick={() => llamar("resolver_caso")} disabled={ocupado}>
                Sí, está resuelto
              </button>
              <button type="button" className="link-btn" onClick={() => setConfirmar(false)} disabled={ocupado}>
                No
              </button>
            </>
          ) : (
            <button type="button" className="btn sm" onClick={() => setConfirmar(true)} disabled={ocupado}>
              Marcar como resuelto
            </button>
          )}
        </div>
      )}
      {error && (
        <p className="form-err" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
