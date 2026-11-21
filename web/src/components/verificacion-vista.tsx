"use client";
/* eslint-disable @next/next/no-img-element -- vistas previas locales (blob:) */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { prepararFoto } from "@/lib/fotos";
import { fechaCO } from "@/lib/medellin";
import { createClient } from "@/lib/supabase/client";
import { FALTA_SQL, miVerificacion, PIEZAS, type MiVerificacion, type Pieza, type TipoVerificacion } from "@/lib/verificacion";

type Foto = { blob: Blob; url: string };

// Verificación de identidad (opcional, igual que en la app): el cliente envía su cédula y una
// selfie; la compañía, su NIT, el RUT o certificado de Cámara de Comercio y la cédula del
// representante. Un admin lo revisa a mano; al terminar se borran las fotos y queda la insignia.
export function VerificacionVista({ tipo, uid, companiaId }: { tipo: TipoVerificacion; uid: string; companiaId?: string }) {
  const [estado, setEstado] = useState<MiVerificacion | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let vivo = true;
    void miVerificacion(uid, tipo, companiaId).then((r) => {
      if (vivo) setEstado(r);
    });
    return () => {
      vivo = false;
    };
  }, [uid, tipo, companiaId, version]);

  if (!estado) return <p className="muted">Revisando tu verificación…</p>;
  return <Formulario tipo={tipo} uid={uid} estado={estado} onEnviada={() => setVersion((v) => v + 1)} />;
}

function Formulario({
  tipo,
  uid,
  estado,
  onEnviada,
}: {
  tipo: TipoVerificacion;
  uid: string;
  estado: MiVerificacion;
  onEnviada: () => void;
}) {
  const [fotos, setFotos] = useState<Record<string, Foto>>({});
  const [preparando, setPreparando] = useState<string | null>(null);
  const [nit, setNit] = useState("");
  const [acepto, setAcepto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const piezas = PIEZAS[tipo];
  const ultima = estado.ultima;
  const enRevision = ultima?.estado === "pendiente";
  const puedeEnviar = !estado.verificado && !enRevision && !estado.faltaSql;
  const sujeto = tipo === "cliente" ? "tu identidad" : "tu compañía";

  // Las vistas previas ocupan memoria: se liberan al salir de la página.
  const vivas = useRef(fotos);
  useEffect(() => {
    vivas.current = fotos;
  }, [fotos]);
  useEffect(() => () => Object.values(vivas.current).forEach((f) => URL.revokeObjectURL(f.url)), []);

  async function elegir(p: Pieza, archivo: File | undefined) {
    if (!archivo) return;
    setError("");
    setPreparando(p.id);
    try {
      const blob = await prepararFoto(archivo);
      const url = URL.createObjectURL(blob);
      setFotos((f) => {
        if (f[p.id]) URL.revokeObjectURL(f[p.id].url);
        return { ...f, [p.id]: { blob, url } };
      });
    } catch {
      setError("No pudimos abrir esa foto. Intenta con otra (JPG o PNG).");
    } finally {
      setPreparando(null);
    }
  }

  async function enviar() {
    const falta = piezas.find((p) => !fotos[p.id]);
    if (falta) return setError(`Falta la foto: ${falta.titulo}.`);
    if (tipo === "compania" && nit.replace(/\D/g, "").length < 8) return setError("Escribe el NIT de la compañía con el dígito de verificación.");
    if (!acepto) return setError("Para enviar, autoriza el tratamiento de tus datos.");
    setEnviando(true);
    setError("");
    const sb = createClient();
    const subidas: string[] = [];
    try {
      for (const p of piezas) {
        const ruta = `${uid}/${crypto.randomUUID()}.jpg`;
        // Sin caché: son documentos privados.
        const { error: e } = await sb.storage
          .from("verificaciones")
          .upload(ruta, fotos[p.id].blob, { contentType: "image/jpeg", upsert: false, cacheControl: "0" });
        if (e) throw { code: /bucket/i.test(e.message) ? "SIN_BUCKET" : "SUBIDA", message: e.message };
        subidas.push(ruta);
      }
      const { error: e } = await sb.rpc("solicitar_verificacion", {
        p_tipo: tipo,
        p_archivos: subidas,
        p_nit: tipo === "compania" ? nit.trim() : null,
        p_acepto: true,
      });
      if (e) throw e;
      Object.values(fotos).forEach((f) => URL.revokeObjectURL(f.url));
      setFotos({});
      setAcepto(false);
      onEnviada();
    } catch (e) {
      // Si algo falla, no deja fotos sueltas en el bucket.
      if (subidas.length) await sb.storage.from("verificaciones").remove(subidas);
      const err = e as { code?: string; message?: string };
      setError(
        err.code === "SIN_BUCKET" || err.code === "PGRST202"
          ? FALTA_SQL
          : err.code === "SUBIDA"
            ? "No pudimos subir las fotos. Revisa tu conexión e intenta de nuevo."
            : err.code === "P0001" && err.message
              ? err.message
              : "No pudimos enviar la verificación. Intenta de nuevo.",
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="verif">
      <div className="verif-cab">
        <span className="verif-escudo" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M12 3 5 6v5c0 4.6 3 8.4 7 10 4-1.6 7-5.4 7-10V6l-7-3z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </span>
        <div>
          <h1 className="title-lg">{tipo === "cliente" ? "Verifica tu identidad" : "Verifica tu compañía"}</h1>
          <p className="muted">
            {tipo === "cliente"
              ? "Las compañías verán la insignia «Identidad verificada» cuando les pidas equipo."
              : "Los clientes verán el sello «Verificada» en tu compañía, en el mapa y en tu perfil."}
          </p>
        </div>
      </div>

      {estado.faltaSql && <p className="note">{FALTA_SQL}</p>}

      {/* En qué va */}
      {estado.verificado ? (
        <p className="form-ok" role="status">
          {tipo === "cliente" ? "✓ Tu identidad está verificada." : "✓ Tu compañía tiene el sello Verificada."}
        </p>
      ) : enRevision && ultima ? (
        <p className="note" role="status">
          Enviada el {fechaCO(ultima.creado)}. Un admin de ENRENTA la está revisando; aquí verás el resultado.
        </p>
      ) : ultima?.estado === "rechazada" ? (
        <p className="form-err" role="alert">
          No pudimos verificar {sujeto}: {ultima.motivo ?? "revisa las fotos"}. Corrige y envíala de nuevo.
        </p>
      ) : null}

      {puedeEnviar ? (
        <>
          <section className="card">
            <h2>Cómo funciona</h2>
            <ol className="verif-pasos">
              <li>{tipo === "cliente" ? "Sube las fotos de tu cédula y una selfie con ella." : "Escribe el NIT y sube las fotos de los documentos."}</li>
              <li>
                {tipo === "cliente"
                  ? "Un admin de ENRENTA las revisa y consulta tu cédula en la Registraduría."
                  : "Un admin de ENRENTA las revisa y consulta el NIT en el RUES."}
              </li>
              <li>Recibes la insignia y borramos las fotos. Es opcional: puedes usar ENRENTA sin verificarte.</li>
            </ol>
          </section>

          <section className="card form">
            {tipo === "compania" && (
              <div className="field">
                <label htmlFor="v-nit">NIT de la compañía</label>
                <input
                  id="v-nit"
                  inputMode="numeric"
                  placeholder="900123456-7"
                  value={nit}
                  onChange={(e) => {
                    setNit(e.target.value.replace(/[^0-9-]/g, "").slice(0, 14));
                    setError("");
                  }}
                />
              </div>
            )}

            <div className="verif-fotos">
              {piezas.map((p) => {
                const foto = fotos[p.id];
                return (
                  <div key={p.id} className={`verif-foto ${foto ? "lista" : ""}`}>
                    <div className="verif-foto-hd">
                      <b>{p.titulo}</b>
                      {foto && <span className="ok-txt">✓</span>}
                    </div>
                    {foto ? (
                      <img src={foto.url} alt={`Vista previa: ${p.titulo}`} />
                    ) : (
                      <span className="fine">{p.ayuda}</span>
                    )}
                    <label className="btn sm verif-elegir">
                      {preparando === p.id ? "Preparando…" : foto ? "Cambiar foto" : "Elegir foto"}
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        disabled={!!preparando || enviando}
                        onChange={(e) => {
                          void elegir(p, e.target.files?.[0]);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                );
              })}
            </div>

            {/* Autorización de datos (Ley 1581 de 2012) */}
            <label className="verif-acepto">
              <input
                type="checkbox"
                checked={acepto}
                onChange={(e) => {
                  setAcepto(e.target.checked);
                  setError("");
                }}
              />
              <span>
                {tipo === "cliente"
                  ? "Autorizo a ENRENTA a usar mis datos y estas fotos, incluida la selfie (un dato biométrico, sensible), solo para verificar mi identidad. Las fotos se borran cuando termina la revisión (Ley 1581 de 2012)."
                  : "Autorizo a ENRENTA a usar estos documentos y datos solo para verificar mi compañía. Las fotos se borran cuando termina la revisión (Ley 1581 de 2012)."}
              </span>
            </label>

            {error && (
              <p className="form-err" role="alert">
                {error}
              </p>
            )}
            <button type="button" className="btn primary lg block" onClick={enviar} disabled={enviando || !!preparando}>
              {enviando ? "Enviando…" : "Enviar a revisión"}
            </button>
          </section>
        </>
      ) : (
        error && (
          <p className="form-err" role="alert">
            {error}
          </p>
        )
      )}

      <Link href={tipo === "cliente" ? "/explorar" : "/tengo/panel"} className="back-link">
        ← Volver
      </Link>
    </div>
  );
}
