"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { fechaCO } from "@/lib/medellin";
import { promedioTexto, type Resena } from "@/lib/resenas";
import { createClient } from "@/lib/supabase/client";

// Estrellas de solo lectura: ★★★★☆
export function Estrellas({ valor, className = "" }: { valor: number; className?: string }) {
  const llenas = Math.round(valor);
  return (
    <span className={`estrellas ${className}`} role="img" aria-label={`${promedioTexto(valor)} de 5 estrellas`}>
      {"★★★★★".slice(0, llenas)}
      <span className="vacias">{"★★★★★".slice(llenas)}</span>
    </span>
  );
}

function mensaje(e: { code?: string; message?: string } | null, porDefecto: string) {
  if (e?.code === "PGRST202") return "Falta ejecutar el SQL 0009_beta_resenas.sql en Supabase.";
  if (e?.code === "P0001" && e.message) return e.message;
  return porDefecto;
}

// El cliente califica a la compañía de una solicitud rentada (o edita su reseña).
export function CalificarCompania({
  reservaId,
  compania,
  inicial,
}: {
  reservaId: string;
  compania: string;
  inicial: { estrellas: number; comentario: string | null } | null;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [estrellas, setEstrellas] = useState(inicial?.estrellas ?? 0);
  const [comentario, setComentario] = useState(inicial?.comentario ?? "");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (estrellas < 1) return setError("Elige de 1 a 5 estrellas.");
    setOcupado(true);
    setError("");
    const { error: err } = await createClient().rpc("dejar_resena", {
      p_reserva: reservaId,
      p_estrellas: estrellas,
      p_comentario: comentario.trim() || null,
    });
    setOcupado(false);
    if (err) return setError(mensaje(err, "No pudimos guardar tu reseña. Intenta de nuevo."));
    setAbierto(false);
    router.refresh();
  }

  if (!abierto) {
    return inicial ? (
      <span className="mi-resena">
        Tu reseña: <Estrellas valor={inicial.estrellas} />
        <button type="button" className="link-btn" onClick={() => setAbierto(true)}>
          Editar
        </button>
      </span>
    ) : (
      <button type="button" className="btn primary" onClick={() => setAbierto(true)}>
        Calificar a {compania}
      </button>
    );
  }

  return (
    <form className="form calificar" onSubmit={enviar} noValidate>
      <fieldset className="field">
        <legend>¿Cómo te fue con {compania}?</legend>
        <div className="estrellas-input" role="radiogroup" aria-label="Calificación">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className={n <= estrellas ? "on" : ""}>
              <input
                type="radio"
                name={`estrellas-${reservaId}`}
                value={n}
                checked={estrellas === n}
                onChange={() => setEstrellas(n)}
                className="sr-only"
              />
              <span aria-hidden="true">★</span>
              <span className="sr-only">
                {n} {n === 1 ? "estrella" : "estrellas"}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="field">
        <label htmlFor={`com-${reservaId}`}>Comentario (opcional)</label>
        <textarea
          id={`com-${reservaId}`}
          rows={3}
          maxLength={1000}
          placeholder="Ej.: el equipo llegó a tiempo, completo y probado."
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
        />
        <span className="hint">Se publica con tu nombre y la inicial de tu apellido.</span>
      </div>
      {error && (
        <p className="form-err" role="alert">
          {error}
        </p>
      )}
      <div className="row-actions">
        <button type="submit" className="btn primary" disabled={ocupado}>
          {ocupado ? "Guardando…" : inicial ? "Guardar cambios" : "Publicar reseña"}
        </button>
        <button type="button" className="link-btn" onClick={() => setAbierto(false)} disabled={ocupado}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

// La compañía responde una reseña (o edita su respuesta).
function ResponderResena({ id, inicial }: { id: string; inicial: string | null }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState(inicial ?? "");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setOcupado(true);
    setError("");
    const { error: err } = await createClient().rpc("responder_resena", { p_resena: id, p_texto: texto.trim() || null });
    setOcupado(false);
    if (err) return setError(mensaje(err, "No pudimos guardar tu respuesta. Intenta de nuevo."));
    setAbierto(false);
    router.refresh();
  }

  if (!abierto) {
    return (
      <button type="button" className="link-btn" onClick={() => setAbierto(true)}>
        {inicial ? "Editar respuesta" : "Responder"}
      </button>
    );
  }
  return (
    <form className="form" onSubmit={enviar} noValidate>
      <div className="field">
        <label htmlFor={`resp-${id}`}>Tu respuesta (pública)</label>
        <textarea id={`resp-${id}`} rows={2} maxLength={1000} value={texto} onChange={(e) => setTexto(e.target.value)} />
      </div>
      {error && (
        <p className="form-err" role="alert">
          {error}
        </p>
      )}
      <div className="row-actions">
        <button type="submit" className="btn primary sm" disabled={ocupado}>
          {ocupado ? "Guardando…" : "Publicar respuesta"}
        </button>
        <button type="button" className="link-btn" onClick={() => setAbierto(false)} disabled={ocupado}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

// Lista de reseñas. Si es la compañía dueña (puedeResponder), cada una trae el botón para responder.
export function ListaResenas({
  resenas,
  compania,
  puedeResponder = false,
}: {
  resenas: Resena[];
  compania: string;
  puedeResponder?: boolean;
}) {
  if (!resenas.length) return <p className="fine">Todavía no hay reseñas.</p>;
  return (
    <ul className="resenas">
      {resenas.map((r) => (
        <li key={r.id}>
          <div className="resena-hd">
            <Estrellas valor={r.estrellas} />
            <b>{r.autor_nombre}</b>
            <span className="fine">{fechaCO(r.creado).split(",").slice(0, 2).join(",")}</span>
          </div>
          {r.comentario && <p>{r.comentario}</p>}
          {r.respuesta && (
            <p className="respuesta">
              <b>Respuesta de {compania}:</b> {r.respuesta}
            </p>
          )}
          {puedeResponder && <ResponderResena id={r.id} inicial={r.respuesta} />}
        </li>
      ))}
    </ul>
  );
}
