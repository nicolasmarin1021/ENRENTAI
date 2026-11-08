"use client";
/* eslint-disable @next/next/no-img-element -- vistas previas locales (blob:) */

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { MAX_FOTOS_PASO, MIN_FOTOS_PASO, PASOS, TIPOS_CASO, type Paso } from "@/lib/entregas";
import { prepararFoto } from "@/lib/fotos";
import { createClient } from "@/lib/supabase/client";

type FotoLocal = { clave: string; blob: Blob; url: string };
type Supabase = ReturnType<typeof createClient>;

// Sube las fotos al bucket privado "entregas" y devuelve sus rutas.
async function subirFotos(supabase: Supabase, prefijo: string, fotos: FotoLocal[]) {
  const rutas = fotos.map(() => `${prefijo}/${crypto.randomUUID()}.jpg`);
  const res = await Promise.all(
    fotos.map((f, i) =>
      supabase.storage.from("entregas").upload(rutas[i], f.blob, { contentType: "image/jpeg", upsert: false }),
    ),
  );
  if (res.some((r) => r.error)) throw new Error("foto");
  return rutas;
}

function mensaje(e: unknown, porDefecto: string) {
  if (e instanceof Error && e.message === "foto") return "Algunas fotos no subieron. Revisa tu conexión e intenta de nuevo.";
  if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "PGRST202")
    return "Las entregas aún no están activadas: falta ejecutar el SQL 0004_entregas.sql en Supabase.";
  if (e && typeof e === "object" && "message" in e && typeof (e as { message?: unknown }).message === "string")
    return (e as { message: string }).message || porDefecto;
  return porDefecto;
}

// Fotos tomadas o elegidas en el momento (se comprimen antes de subir).
function SelectorFotos({
  fotos,
  setFotos,
  max,
  disabled,
}: {
  fotos: FotoLocal[];
  setFotos: (f: FotoLocal[] | ((p: FotoLocal[]) => FotoLocal[])) => void;
  max: number;
  disabled: boolean;
}) {
  const [preparando, setPreparando] = useState(false);
  const [error, setError] = useState("");
  const urls = useRef<string[]>([]);
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  async function elegir(e: ChangeEvent<HTMLInputElement>) {
    const lista = Array.from(e.target.files ?? []).slice(0, max - fotos.length);
    e.target.value = "";
    if (!lista.length) return;
    setPreparando(true);
    setError("");
    const nuevas: FotoLocal[] = [];
    for (const archivo of lista) {
      try {
        const blob = await prepararFoto(archivo);
        const url = URL.createObjectURL(blob);
        urls.current.push(url);
        nuevas.push({ clave: crypto.randomUUID(), blob, url });
      } catch {
        setError("Una de las fotos no se pudo abrir. Usa JPG, PNG o WebP.");
      }
    }
    setFotos((p) => [...p, ...nuevas].slice(0, max));
    setPreparando(false);
  }

  return (
    <>
      <div className="fotos">
        {fotos.map((f, i) => (
          <div key={f.clave} className="foto">
            <img src={f.url} alt={`Foto ${i + 1}`} />
            <button
              type="button"
              className="quitar"
              aria-label={`Quitar la foto ${i + 1}`}
              disabled={disabled}
              onClick={() => setFotos((p) => p.filter((x) => x.clave !== f.clave))}
            >
              ×
            </button>
          </div>
        ))}
        {fotos.length < max && (
          <label className="foto-add">
            <span aria-hidden="true">+</span>
            {preparando ? "Preparando…" : "Tomar o elegir fotos"}
            <input
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={elegir}
              disabled={preparando || disabled}
            />
          </label>
        )}
      </div>
      {error && <p className="form-err" role="alert">{error}</p>}
    </>
  );
}

// Registrar uno de los 4 pasos con fotos y lista de revisión.
export function RegistrarPaso({ reservaId, paso }: { reservaId: string; paso: Paso }) {
  const def = PASOS.find((p) => p.k === paso)!;
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [fotos, setFotos] = useState<FotoLocal[]>([]);
  const [marcados, setMarcados] = useState<string[]>([]);
  const [nota, setNota] = useState("");
  const [estado, setEstado] = useState("");
  const [error, setError] = useState("");

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    if (fotos.length < MIN_FOTOS_PASO) return setError(`Agrega al menos ${MIN_FOTOS_PASO} fotos del equipo.`);
    if (marcados.length < def.checks.length)
      return setError("Marca toda la lista de revisión. Si algo no está bien, abre un caso.");
    setError("");
    try {
      const supabase = createClient();
      setEstado(`Subiendo ${fotos.length} fotos…`);
      const rutas = await subirFotos(supabase, `${reservaId}/${paso}`, fotos);
      setEstado("Guardando…");
      const { error: e } = await supabase.rpc("registrar_acta", {
        p_reserva: reservaId,
        p_paso: paso,
        p_checks: def.checks,
        p_nota: nota.trim() || null,
        p_fotos: rutas,
      });
      if (e) throw e;
    } catch (e) {
      setEstado("");
      setError(mensaje(e, "No pudimos registrar este paso. Intenta de nuevo."));
      return;
    }
    setEstado("");
    setAbierto(false);
    router.refresh();
  }

  if (!abierto) {
    return (
      <button type="button" className="btn primary" onClick={() => setAbierto(true)} style={{ justifySelf: "start" }}>
        {def.verbo}
      </button>
    );
  }

  const ocupado = estado !== "";
  return (
    <form className="form paso-form" onSubmit={enviar} noValidate>
      <div className="field">
        <span className="etiqueta">Fotos del equipo (mínimo {MIN_FOTOS_PASO})</span>
        <span className="hint">El equipo completo, sus estuches, accesorios y cualquier detalle visible.</span>
        <SelectorFotos fotos={fotos} setFotos={setFotos} max={MAX_FOTOS_PASO} disabled={ocupado} />
      </div>
      <fieldset className="field">
        <legend>Lista de revisión</legend>
        <div className="checks">
          {def.checks.map((c) => (
            <label key={c} className="switch">
              <input
                type="checkbox"
                checked={marcados.includes(c)}
                onChange={(e) => setMarcados((m) => (e.target.checked ? [...m, c] : m.filter((x) => x !== c)))}
                disabled={ocupado}
              />
              {c}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="field">
        <label htmlFor={`nota-${paso}`}>Observaciones (opcional)</label>
        <textarea id={`nota-${paso}`} rows={2} maxLength={1000} value={nota} onChange={(e) => setNota(e.target.value)} disabled={ocupado} />
      </div>
      {error && <p className="form-err" role="alert">{error}</p>}
      <div className="row-actions">
        <button type="submit" className="btn primary" disabled={ocupado}>
          {estado || def.verbo}
        </button>
        <a href="#casos" className="link-btn">Hay una novedad</a>
        <button type="button" className="link-btn" onClick={() => setAbierto(false)} disabled={ocupado}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

// Abrir un caso (daño, faltante, etc.). Mientras esté abierto, el depósito queda retenido.
export function AbrirCaso({ reservaId }: { reservaId: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState("dano");
  const [descripcion, setDescripcion] = useState("");
  const [fotos, setFotos] = useState<FotoLocal[]>([]);
  const [estado, setEstado] = useState("");
  const [error, setError] = useState("");

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    if (descripcion.trim().length < 10) return setError("Cuéntanos qué pasó (al menos 10 caracteres).");
    setError("");
    try {
      const supabase = createClient();
      let rutas: string[] = [];
      if (fotos.length) {
        setEstado(`Subiendo ${fotos.length} ${fotos.length === 1 ? "foto" : "fotos"}…`);
        rutas = await subirFotos(supabase, `${reservaId}/casos`, fotos);
      }
      setEstado("Abriendo el caso…");
      const { error: e } = await supabase.rpc("abrir_caso", {
        p_reserva: reservaId,
        p_tipo: tipo,
        p_descripcion: descripcion.trim(),
        p_fotos: rutas,
      });
      if (e) throw e;
    } catch (e) {
      setEstado("");
      setError(mensaje(e, "No pudimos abrir el caso. Intenta de nuevo."));
      return;
    }
    setEstado("");
    setAbierto(false);
    setDescripcion("");
    setFotos([]);
    router.refresh();
  }

  if (!abierto) {
    return (
      <button type="button" className="btn danger" onClick={() => setAbierto(true)} style={{ justifySelf: "start" }}>
        Abrir un caso
      </button>
    );
  }
  const ocupado = estado !== "";
  return (
    <form className="card form" onSubmit={enviar} noValidate>
      <h3>Abrir un caso</h3>
      <p className="muted">Cuéntanos qué pasó. La otra parte y ENRENTA lo verán, y el depósito queda retenido hasta resolverlo.</p>
      <div className="field">
        <label htmlFor="caso-tipo">Tipo de novedad</label>
        <select id="caso-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} disabled={ocupado}>
          {Object.entries(TIPOS_CASO).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="caso-desc">Qué pasó</label>
        <textarea
          id="caso-desc"
          rows={3}
          maxLength={2000}
          placeholder="Ej.: uno de los bodypacks llegó con la antena doblada y no enciende"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          disabled={ocupado}
        />
      </div>
      <div className="field">
        <span className="etiqueta">Fotos (opcional)</span>
        <SelectorFotos fotos={fotos} setFotos={setFotos} max={MAX_FOTOS_PASO} disabled={ocupado} />
      </div>
      {error && <p className="form-err" role="alert">{error}</p>}
      <div className="row-actions">
        <button type="submit" className="btn danger solid" disabled={ocupado}>{estado || "Abrir caso"}</button>
        <button type="button" className="link-btn" onClick={() => setAbierto(false)} disabled={ocupado}>Cancelar</button>
      </div>
    </form>
  );
}

// Mensajes dentro de un caso y marcarlo como resuelto.
export function AccionesCaso({ casoId, abierto }: { casoId: string; abierto: boolean }) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [error, setError] = useState("");

  async function llamar(fn: "comentar_caso" | "resolver_caso") {
    setOcupado(true);
    setError("");
    const args = fn === "comentar_caso" ? { p_caso: casoId, p_texto: texto.trim() } : { p_caso: casoId };
    const { error: e } = await createClient().rpc(fn, args);
    setOcupado(false);
    if (e) return setError(mensaje(e, "No pudimos guardar. Intenta de nuevo."));
    setTexto("");
    setConfirmar(false);
    router.refresh();
  }

  return (
    <div className="form">
      <div className="input-btn">
        <input
          aria-label="Escribe un mensaje en el caso"
          placeholder="Escribe un mensaje…"
          maxLength={2000}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          disabled={ocupado}
          className="input-suelto"
        />
        <button type="button" className="btn" onClick={() => llamar("comentar_caso")} disabled={ocupado || !texto.trim()}>
          Enviar
        </button>
      </div>
      {abierto && (
        <div className="row-actions">
          {confirmar ? (
            <>
              <button type="button" className="btn primary sm" onClick={() => llamar("resolver_caso")} disabled={ocupado}>
                Sí, marcar como resuelto
              </button>
              <button type="button" className="link-btn" onClick={() => setConfirmar(false)}>No</button>
            </>
          ) : (
            <button type="button" className="link-btn" onClick={() => setConfirmar(true)}>Marcar como resuelto</button>
          )}
        </div>
      )}
      {error && <p className="form-err" role="alert">{error}</p>}
    </div>
  );
}
