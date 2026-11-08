"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Mapa } from "@/components/mapa";
import { adivinarCategoria, coincide, equiposPara, norm } from "@/lib/busqueda";
import type { Categoria } from "@/lib/catalogo";
import type { EquipoPublico, LugarPublico } from "@/lib/catalogo-publico";
import { MEDELLIN } from "@/lib/geo";
import { pesos } from "@/lib/medellin";
import { diasDeRenta, fechaLocal, textoFecha, type GuardarPedido, type LugarPedido, type Necesidad, type Pedido } from "@/lib/pedido";

type Base = { pedido: Pedido; guardar: GuardarPedido; onSiguiente: () => void };

// ============================================================================
// Paso 1: ¿Qué necesitas?
// ============================================================================
export function PasoQue({
  pedido,
  guardar,
  onSiguiente,
  categorias,
  equipos,
}: Base & { categorias: Categoria[]; equipos: EquipoPublico[] }) {
  const [texto, setTexto] = useState("");
  const [preguntar, setPreguntar] = useState<string | null>(null); // texto que espera su categoría
  const nombreCat = (id: string) => categorias.find((c) => c.id === id)?.nombre ?? id;

  const sugerencias = useMemo(() => {
    const t = texto.trim();
    if (t.length < 2) return [];
    const grupos = new Map<string, { nombre: string; categoria: string; unidades: number; companias: Set<string>; desde: number }>();
    for (const e of equipos.filter((x) => coincide(t, x))) {
      const k = norm(e.nombre);
      const g = grupos.get(k) ?? { nombre: e.nombre, categoria: e.categoria_id, unidades: 0, companias: new Set(), desde: Infinity };
      g.unidades += e.unidades;
      g.companias.add(e.compania_id);
      g.desde = Math.min(g.desde, e.precio_dia);
      grupos.set(k, g);
    }
    return [...grupos.values()].slice(0, 6);
  }, [texto, equipos]);

  function agregar(t: string, categoria: string) {
    const limpio = t.trim().replace(/\s+/g, " ");
    const ya = pedido.necesidades.find((n) => n.categoria === categoria && norm(n.texto) === norm(limpio));
    const necesidades: Necesidad[] = ya
      ? pedido.necesidades.map((n) => (n === ya ? { ...n, cantidad: n.cantidad + 1 } : n))
      : [...pedido.necesidades, { id: crypto.randomUUID(), texto: limpio, categoria, cantidad: 1 }];
    guardar({ ...pedido, necesidades });
    setTexto("");
    setPreguntar(null);
  }

  function alAgregarTexto(ev: FormEvent) {
    ev.preventDefault();
    const t = texto.trim();
    if (t.length < 2) return;
    const cat = adivinarCategoria(t, equipos);
    if (cat) agregar(t, cat);
    else setPreguntar(t);
  }

  function cambiarCantidad(id: string, delta: number) {
    guardar({
      ...pedido,
      necesidades: pedido.necesidades
        .map((n) => (n.id === id ? { ...n, cantidad: Math.min(999, n.cantidad + delta) } : n))
        .filter((n) => n.cantidad > 0),
    });
  }

  return (
    <div className="wz-paso">
      <div>
        <h1 className="title-lg">¿Qué necesitas rentar?</h1>
        <p className="muted">Escribe marca y modelo, o elige un tipo de equipo. Puedes agregar varias cosas.</p>
      </div>

      <form className="card form" onSubmit={alAgregarTexto}>
        <div className="field">
          <label htmlFor="que">Equipo</label>
          <div className="input-btn">
            <input
              id="que"
              autoComplete="off"
              placeholder="Ej.: Shure Axient, PSM1000, consola Digico…"
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value);
                setPreguntar(null);
              }}
            />
            <button type="submit" className="btn primary" disabled={texto.trim().length < 2}>
              Agregar
            </button>
          </div>
        </div>

        {preguntar && (
          <div className="pregunta" role="status">
            <p>
              ¿Qué tipo de equipo es <b>«{preguntar}»</b>?
            </p>
            <div className="chips">
              {categorias.map((c) => (
                <button key={c.id} type="button" className="chip" onClick={() => agregar(preguntar, c.id)}>
                  {c.nombre}
                </button>
              ))}
            </div>
          </div>
        )}

        {!preguntar && sugerencias.length > 0 && (
          <div className="sug">
            <p className="fine">Disponibles en ENRENTA que coinciden con «{texto.trim()}»</p>
            {sugerencias.map((g) => (
              <button key={g.nombre} type="button" className="sug-item" onClick={() => agregar(g.nombre, g.categoria)}>
                <span>
                  <b>{g.nombre}</b>
                  <span className="fine">
                    {nombreCat(g.categoria)} · {g.unidades} {g.unidades === 1 ? "unidad" : "unidades"} en{" "}
                    {g.companias.size} {g.companias.size === 1 ? "compañía" : "compañías"} · desde {pesos(g.desde)} / 24 h
                  </span>
                </span>
                <span className="mas" aria-hidden="true">+</span>
              </button>
            ))}
          </div>
        )}

        {!preguntar && (
          <div className="sug">
            <p className="fine">O elige un tipo de equipo</p>
            <div className="chips">
              {categorias.map((c) => (
                <button key={c.id} type="button" className="chip" onClick={() => agregar("", c.id)}>
                  + {c.nombre}
                </button>
              ))}
            </div>
          </div>
        )}
      </form>

      {pedido.necesidades.length > 0 && (
        <section className="card">
          <h2>Tu pedido</h2>
          <ul className="nec-lista">
            {pedido.necesidades.map((n) => {
              const { exactos, alternativas } = equiposPara(n, equipos);
              const lista = exactos.length ? exactos : alternativas;
              const unidades = lista.reduce((a, e) => a + e.unidades, 0);
              const comps = new Set(lista.map((e) => e.compania_id)).size;
              const estado = !lista.length
                ? `Aún no hay ${nombreCat(n.categoria).toLowerCase()} publicados en Medellín.`
                : exactos.length || !n.texto
                  ? `${unidades} ${unidades === 1 ? "unidad" : "unidades"} en ${comps} ${comps === 1 ? "compañía" : "compañías"}`
                  : `No encontramos «${n.texto}» exacto; hay ${alternativas.length} ${alternativas.length === 1 ? "alternativa" : "alternativas"} de esta categoría.`;
              return (
                <li key={n.id} className="nec">
                  <div className="nec-info">
                    <b>{n.texto || nombreCat(n.categoria)}</b>
                    <span className="fine">
                      {n.texto ? `${nombreCat(n.categoria)} · ` : ""}
                      {estado}
                    </span>
                  </div>
                  <div className="qty" role="group" aria-label={`Cantidad de ${n.texto || nombreCat(n.categoria)}`}>
                    <button type="button" onClick={() => cambiarCantidad(n.id, -1)} aria-label="Uno menos">
                      −
                    </button>
                    <span aria-live="polite">{n.cantidad}</span>
                    <button type="button" onClick={() => cambiarCantidad(n.id, 1)} aria-label="Uno más">
                      +
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="row-actions">
        <button type="button" className="btn primary lg" disabled={!pedido.necesidades.length} onClick={onSiguiente}>
          Continuar
        </button>
        {!pedido.necesidades.length && <span className="fine">Agrega al menos un equipo para continuar.</span>}
      </div>
    </div>
  );
}

// ============================================================================
// Paso 2: ¿Cuándo?
// ============================================================================
const HORAS = Array.from({ length: 36 }, (_, i) => {
  const h = 6 + Math.floor(i / 2);
  return `${String(h).padStart(2, "0")}:${i % 2 ? "30" : "00"}`;
}); // 06:00 a 23:30

export function PasoCuando({ pedido, guardar, onSiguiente, onAtras }: Base & { onAtras: () => void }) {
  const [error, setError] = useState("");
  const [fe, he] = (pedido.entrega || "T").split("T");
  const [fr, hr] = (pedido.recogida || "T").split("T");
  const dias = diasDeRenta(pedido.entrega, pedido.recogida);
  const horas = pedido.entrega && pedido.recogida ? (+new Date(pedido.recogida) - +new Date(pedido.entrega)) / 36e5 : 0;

  const set = (cual: "entrega" | "recogida", fecha: string, hora: string) => {
    setError("");
    guardar({ ...pedido, [cual]: fecha && hora ? `${fecha}T${hora}` : fecha ? `${fecha}T${hora || "10:00"}` : "" });
  };

  function continuar() {
    if (!pedido.entrega || !pedido.recogida) return setError("Elige la fecha y la hora de entrega y de recogida.");
    if (new Date(pedido.entrega) < new Date()) return setError("La entrega debe ser en el futuro.");
    if (dias < 1) return setError("La recogida debe ser después de la entrega.");
    onSiguiente();
  }

  return (
    <div className="wz-paso">
      <div>
        <h1 className="title-lg">¿Cuándo los necesitas?</h1>
        <p className="muted">Se cobra un día por cada 24 horas entre la entrega y la recogida.</p>
      </div>
      <section className="card">
        <div className="form-grid">
          <fieldset className="field">
            <legend>Entrega</legend>
            <div className="fecha-hora">
              <input type="date" aria-label="Fecha de entrega" value={fe} onChange={(e) => set("entrega", e.target.value, he)} />
              <select aria-label="Hora de entrega" value={he} onChange={(e) => set("entrega", fe, e.target.value)}>
                {!he && <option value="">Hora</option>}
                {HORAS.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          </fieldset>
          <fieldset className="field">
            <legend>Recogida</legend>
            <div className="fecha-hora">
              <input type="date" aria-label="Fecha de recogida" min={fe || undefined} value={fr} onChange={(e) => set("recogida", e.target.value, hr)} />
              <select aria-label="Hora de recogida" value={hr} onChange={(e) => set("recogida", fr, e.target.value)}>
                {!hr && <option value="">Hora</option>}
                {HORAS.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          </fieldset>
        </div>
        {dias > 0 && (
          <p className="form-ok">
            {dias} {dias === 1 ? "día" : "días"} de renta ({String(Math.round(horas * 10) / 10).replace(".", ",")} h) · {textoFecha(pedido.entrega)} →{" "}
            {textoFecha(pedido.recogida)}
          </p>
        )}
        {error && <p className="form-err" role="alert">{error}</p>}
      </section>
      <div className="row-actions">
        <button type="button" className="btn primary lg" onClick={continuar}>Continuar</button>
        <button type="button" className="link-btn" onClick={onAtras}>Atrás</button>
      </div>
    </div>
  );
}

// Fechas sugeridas la primera vez: mañana 14:00 → pasado mañana 12:00.
export const fechasSugeridas = () => ({ entrega: fechaLocal(1, 14), recogida: fechaLocal(2, 12) });

// ============================================================================
// Paso 3: ¿Dónde es el show?
// ============================================================================
export function PasoDonde({
  pedido,
  guardar,
  onSiguiente,
  onAtras,
  lugares,
}: Base & { onAtras: () => void; lugares: LugarPublico[] }) {
  const propio = pedido.lugar && !pedido.lugar.id ? pedido.lugar : null;
  const [modo, setModo] = useState<"lista" | "otro">(propio || !lugares.length ? "otro" : "lista");
  const [nombre, setNombre] = useState(propio?.nombre ?? "");
  const [direccion, setDireccion] = useState(propio?.direccion ?? "");
  const [pin, setPin] = useState(propio ? { lat: propio.lat, lng: propio.lng } : null);
  const [error, setError] = useState("");

  function elegir(l: LugarPublico) {
    setError("");
    guardar({ ...pedido, lugar: { id: l.id, nombre: l.nombre, direccion: l.direccion ?? undefined, lat: l.lat, lng: l.lng } });
  }

  function continuar() {
    if (modo === "lista") {
      if (!pedido.lugar?.id) return setError("Elige el lugar del show.");
      guardar({ ...pedido, listo: true });
      return onSiguiente();
    }
    if (nombre.trim().length < 2) return setError("Escribe el nombre del lugar.");
    if (direccion.trim().length < 5) return setError("Escribe la dirección exacta del lugar.");
    if (!pin) return setError("Marca en el mapa dónde queda la entrada del lugar.");
    const lugar: LugarPedido = { nombre: nombre.trim(), direccion: direccion.trim(), lat: pin.lat, lng: pin.lng };
    guardar({ ...pedido, lugar, listo: true });
    onSiguiente();
  }

  return (
    <div className="wz-paso">
      <div>
        <h1 className="title-lg">¿Dónde es el show?</h1>
        <p className="muted">Con el lugar calculamos la distancia a cada bodega y el costo de entrega.</p>
      </div>

      {lugares.length > 0 && (
        <div className="seg" role="radiogroup" aria-label="Tipo de lugar">
          <label>
            <input type="radio" name="modo-lugar" checked={modo === "lista"} onChange={() => setModo("lista")} />
            Un lugar conocido
          </label>
          <label>
            <input type="radio" name="modo-lugar" checked={modo === "otro"} onChange={() => setModo("otro")} />
            Otro lugar
          </label>
        </div>
      )}

      {modo === "lista" ? (
        <div className="lugares" role="radiogroup" aria-label="Lugares de Medellín">
          {lugares.map((l) => (
            <label key={l.id} className="lugar">
              <input type="radio" name="lugar" checked={pedido.lugar?.id === l.id} onChange={() => elegir(l)} />
              <span>
                <b>{l.nombre}</b>
                {l.direccion && <span className="fine">{l.direccion}</span>}
              </span>
            </label>
          ))}
        </div>
      ) : (
        <section className="card">
          <div className="form-grid">
            <div className="field">
              <label htmlFor="lg-nombre">Nombre del lugar</label>
              <input id="lg-nombre" placeholder="Ej.: Finca La Esperanza" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="lg-dir">Dirección exacta</label>
              <input id="lg-dir" placeholder="Ej.: Cra. 43A # 1-50, El Poblado" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
            </div>
          </div>
          <p className="fine">Toca el mapa o arrastra el pin hasta la entrada del lugar.</p>
          <div className="mapa-mini">
            <Mapa
              etiqueta="Mapa para marcar el lugar del show"
              pin={pin ?? null}
              onPin={(p) => {
                setPin(p);
                setError("");
              }}
              pinConClic
              zoom={12}
            />
          </div>
          {!pin && (
            <button type="button" className="link-btn" style={{ justifySelf: "start" }} onClick={() => setPin(MEDELLIN)}>
              Poner el pin en el centro de Medellín
            </button>
          )}
        </section>
      )}

      {error && <p className="form-err" role="alert">{error}</p>}
      <div className="row-actions">
        <button type="button" className="btn primary lg" onClick={continuar}>Ver disponibilidad en el mapa</button>
        <button type="button" className="link-btn" onClick={onAtras}>Atrás</button>
      </div>
    </div>
  );
}
