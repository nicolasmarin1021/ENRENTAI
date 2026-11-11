"use client";
/* eslint-disable @next/next/no-img-element -- vistas previas locales (blob:) y fotos privadas con enlace firmado */

import { useEffect, useRef, useState, type RefObject } from "react";
import { prepararFoto } from "@/lib/fotos";
import type { createClient } from "@/lib/supabase/client";

export type FotoLocal = { clave: string; blob: Blob; url: string };

// Fotos tomadas o elegidas en el momento: se comprimen y se muestran antes de subir.
export function useFotosLocales(max: number) {
  const [fotos, setFotos] = useState<FotoLocal[]>([]);
  const [preparando, setPreparando] = useState(false);
  const [error, setError] = useState("");
  const vivas = useRef(new Set<string>());

  // Libera las vistas previas al salir de la página.
  useEffect(() => {
    const v = vivas.current;
    return () => v.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  async function agregar(archivos: File[]) {
    const lista = archivos.slice(0, Math.max(0, max - fotos.length));
    if (!lista.length) return;
    setPreparando(true);
    setError("");
    const nuevas: FotoLocal[] = [];
    for (const archivo of lista) {
      try {
        const blob = await prepararFoto(archivo);
        const url = URL.createObjectURL(blob);
        vivas.current.add(url);
        nuevas.push({ clave: crypto.randomUUID(), blob, url });
      } catch {
        setError("Una de las fotos no se pudo abrir. Usa JPG, PNG o WebP.");
      }
    }
    setFotos((p) => [...p, ...nuevas].slice(0, max));
    setPreparando(false);
  }

  function quitar(clave: string) {
    const f = fotos.find((x) => x.clave === clave);
    if (f) {
      URL.revokeObjectURL(f.url);
      vivas.current.delete(f.url);
    }
    setFotos((p) => p.filter((x) => x.clave !== clave));
  }

  function vaciar() {
    fotos.forEach((f) => {
      URL.revokeObjectURL(f.url);
      vivas.current.delete(f.url);
    });
    setFotos([]);
    setError("");
  }

  return { fotos, preparando, error, max, agregar, quitar, vaciar };
}

export function SelectorFotos({ estado, disabled }: { estado: ReturnType<typeof useFotosLocales>; disabled: boolean }) {
  const { fotos, preparando, error, max, agregar, quitar } = estado;
  return (
    <>
      <div className="fotos">
        {fotos.map((f, i) => (
          <div key={f.clave} className="foto">
            <img src={f.url} alt={`Foto ${i + 1}`} />
            <button type="button" className="quitar" aria-label={`Quitar la foto ${i + 1}`} disabled={disabled} onClick={() => quitar(f.clave)}>
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
              disabled={preparando || disabled}
              onChange={(e) => {
                const archivos = Array.from(e.target.files ?? []);
                e.target.value = "";
                void agregar(archivos);
              }}
            />
          </label>
        )}
      </div>
      {error && (
        <p className="form-err" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

// Sube las fotos al bucket privado "entregas" y devuelve sus rutas.
export async function subirFotos(supabase: ReturnType<typeof createClient>, prefijo: string, fotos: FotoLocal[]) {
  const rutas = fotos.map(() => `${prefijo}/${crypto.randomUUID()}.jpg`);
  const res = await Promise.all(
    fotos.map((f, i) => supabase.storage.from("entregas").upload(rutas[i], f.blob, { contentType: "image/jpeg", upsert: false })),
  );
  const fallo = res.find((r) => r.error);
  if (fallo?.error) {
    console.error("No subió una foto:", fallo.error.message);
    throw new Error("foto");
  }
  return rutas;
}

// Mensaje claro para la persona a partir de un error de Supabase.
export function mensajeError(e: unknown, porDefecto: string) {
  if (e instanceof Error && e.message === "foto")
    return "Algunas fotos no subieron. Revisa tu conexión e intenta de nuevo. Si sigue pasando, revisa que el SQL 0004_entregas.sql esté ejecutado.";
  const err = e as { code?: string; message?: string } | null;
  if (err?.code === "PGRST202")
    return "Falta ejecutar el SQL 0007_entregas_completas.sql en Supabase para registrar entregas y casos.";
  if (err?.code === "P0001" && err.message) return err.message; // mensajes propios de la base de datos
  return porDefecto;
}

// Miniaturas de las fotos ya registradas (abren el visor).
export function Miniaturas({ fotos, etiqueta, max = 3, onAbrir }: { fotos: string[]; etiqueta: string; max?: number; onAbrir: (i: number) => void }) {
  if (!fotos.length) return null;
  return (
    <div className="fs-thumbs">
      {fotos.slice(0, max).map((u, i) => (
        <button key={u} type="button" className="fs-th" onClick={() => onAbrir(i)} aria-label={`Ver foto ${i + 1} de ${etiqueta}`}>
          <img src={u} alt="" loading="lazy" />
        </button>
      ))}
      {fotos.length > max && (
        <button type="button" className="link-btn fs-mas" onClick={() => onAbrir(max)} aria-label={`Ver las otras ${fotos.length - max} fotos de ${etiqueta}`}>
          +{fotos.length - max}
        </button>
      )}
    </div>
  );
}

export type Visor = { fotos: string[]; i: number; titulo: string };

// Ver las fotos en grande, una por una.
export function VisorFotos({
  ref,
  visor,
  onMover,
  onCerrar,
}: {
  ref: RefObject<HTMLDialogElement | null>;
  visor: Visor | null;
  onMover: (paso: number) => void;
  onCerrar: () => void;
}) {
  const n = visor?.fotos.length ?? 0;
  return (
    <dialog
      ref={ref}
      className="ficha modal visor"
      aria-label={visor ? `${visor.titulo}: foto ${visor.i + 1} de ${n}` : "Fotos"}
      onClose={onCerrar}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") onMover(-1);
        if (e.key === "ArrowRight") onMover(1);
      }}
    >
      {visor && (
        <div className="dlg">
          <header className="dlg-hd">
            <div>
              <span className="fine">{visor.titulo}</span>
              <h2>
                Foto {visor.i + 1} de {n}
              </h2>
            </div>
            <button type="button" className="cerrar" aria-label="Cerrar" onClick={() => ref.current?.close()}>
              ×
            </button>
          </header>
          <div className="dlg-body">
            <img className="visor-img" src={visor.fotos[visor.i]} alt={`${visor.titulo}: foto ${visor.i + 1}`} />
          </div>
          <footer className="dlg-ft">
            <button type="button" className="btn" disabled={visor.i === 0} onClick={() => onMover(-1)}>
              Anterior
            </button>
            <button type="button" className="btn" disabled={visor.i === n - 1} onClick={() => onMover(1)}>
              Siguiente
            </button>
            <span className="grow" />
            <a className="link-btn" href={visor.fotos[visor.i]} target="_blank" rel="noreferrer">
              Abrir en otra pestaña
            </a>
          </footer>
        </div>
      )}
    </dialog>
  );
}
