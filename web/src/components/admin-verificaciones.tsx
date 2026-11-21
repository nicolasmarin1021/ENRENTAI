"use client";
/* eslint-disable @next/next/no-img-element -- fotos privadas con enlace firmado */

import { useEffect, useState } from "react";
import { fechaCO } from "@/lib/medellin";
import { createClient } from "@/lib/supabase/client";
import {
  CONSULTA_CEDULA,
  CONSULTA_NIT,
  MOTIVOS_RECHAZO,
  urlsFirmadas,
  verificacionesPendientes,
  type Pendiente,
} from "@/lib/verificacion";

const NOMBRES_FOTOS: Record<Pendiente["tipo"], string[]> = {
  cliente: ["Cédula · frente", "Cédula · reverso", "Selfie con la cédula"],
  compania: ["RUT o certificado de Cámara de Comercio", "Cédula del representante legal"],
};

// Las verificaciones de identidad por revisar (igual que en la app). El admin mira las fotos,
// consulta la cédula en la Registraduría (o el NIT en el RUES) y aprueba o rechaza con un motivo.
// Al terminar, las fotos se borran del bucket privado.
export function AdminVerificaciones() {
  const [lista, setLista] = useState<Pendiente[] | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let vivo = true;
    void verificacionesPendientes().then((r) => {
      if (!vivo) return;
      setLista(r.lista);
      setError(r.error);
    });
    return () => {
      vivo = false;
    };
  }, [version]);

  const recargar = () => setVersion((v) => v + 1);

  return (
    <div className="verif">
      <div className="page-hd">
        <div>
          <h1 className="title-lg">Verificaciones</h1>
          <p className="muted">
            Revisa que las fotos se vean bien, que la selfie coincida con la cédula y consulta el documento antes de aprobar. Al
            aprobar o rechazar, las fotos se borran.
          </p>
        </div>
        <div className="row-actions">
          <button type="button" className="btn sm" onClick={recargar}>
            Actualizar
          </button>
        </div>
      </div>
      {error && (
        <p className="form-err" role="alert">
          {error}
        </p>
      )}
      {lista === null ? (
        <p className="muted">Cargando verificaciones…</p>
      ) : lista.length ? (
        lista.map((v) => <TarjetaPendiente key={v.id} v={v} onListo={recargar} />)
      ) : (
        <div className="empty">
          <span className="ok-txt" aria-hidden="true">
            ✓
          </span>
          <p className="muted">No hay verificaciones por revisar.</p>
        </div>
      )}
    </div>
  );
}

function TarjetaPendiente({ v, onListo }: { v: Pendiente; onListo: () => void }) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [rechazando, setRechazando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  const [sinBorrar, setSinBorrar] = useState(false); // la revisión quedó, pero las fotos no se borraron
  const clave = v.archivos.join(",");

  // Enlaces temporales para ver las fotos privadas.
  useEffect(() => {
    let vivo = true;
    void urlsFirmadas(clave ? clave.split(",") : []).then((m) => {
      if (vivo) setUrls(m);
    });
    return () => {
      vivo = false;
    };
  }, [clave]);

  async function resolver(aprobar: boolean) {
    if (!aprobar && motivo.trim().length < 4) return setError("Escribe o elige el motivo del rechazo.");
    setOcupado(true);
    setError("");
    const { error: e } = await createClient().rpc("revisar_verificacion", {
      p_id: v.id,
      p_aprobar: aprobar,
      p_motivo: aprobar ? null : motivo.trim(),
    });
    if (e) {
      setOcupado(false);
      return setError(e.code === "P0001" && e.message ? e.message : "No pudimos guardar la revisión. Intenta de nuevo.");
    }
    await borrarFotos();
  }

  // Ya no se necesitan: se borran las fotos (son datos sensibles). Si falla, se reintenta una vez y,
  // si sigue fallando, la tarjeta se queda con un botón para volver a intentarlo.
  async function borrarFotos() {
    setOcupado(true);
    const quitar = () => createClient().storage.from("verificaciones").remove(v.archivos);
    let { error: e } = v.archivos.length ? await quitar() : { error: null };
    if (e) ({ error: e } = await quitar());
    setOcupado(false);
    if (e) {
      setSinBorrar(true);
      return setError("La revisión quedó guardada, pero no pudimos borrar las fotos. Revisa tu conexión y toca «Borrar las fotos».");
    }
    onListo();
  }

  return (
    <article className="card verif-pendiente">
      <header className="verif-pendiente-hd">
        <span className={`tag ${v.tipo === "cliente" ? "" : "warn"}`}>{v.tipo === "cliente" ? "Cliente" : "Compañía"}</span>
        <span className="fine">{fechaCO(v.creado)}</span>
      </header>
      <div>
        <h2>{v.tipo === "compania" && v.compania ? v.compania : v.nombre || "Sin nombre"}</h2>
        {v.tipo === "compania" && <p className="fine">Dueño: {v.nombre || "sin nombre"}</p>}
        {v.correo && <p className="fine">{v.correo}</p>}
        {v.nit && <p><b>NIT {v.nit}</b></p>}
      </div>

      <div className="verif-fotos">
        {v.archivos.map((ruta, i) => (
          <figure key={ruta} className="verif-foto">
            <figcaption className="lbl">{NOMBRES_FOTOS[v.tipo][i] ?? `Foto ${i + 1}`}</figcaption>
            {urls[ruta] ? (
              // Se abre en otra pestaña para verla en grande; el enlace vence en 10 minutos.
              <a href={urls[ruta]} target="_blank" rel="noreferrer" title="Ver en grande">
                <img src={urls[ruta]} alt={NOMBRES_FOTOS[v.tipo][i] ?? "Foto"} referrerPolicy="no-referrer" />
              </a>
            ) : (
              <span className="fine">Cargando la foto…</span>
            )}
          </figure>
        ))}
      </div>

      <div className="row-actions">
        <a href={CONSULTA_CEDULA} target="_blank" rel="noreferrer" className="btn sm">
          Consultar cédula (Registraduría)
        </a>
        {v.tipo === "compania" && (
          <a href={CONSULTA_NIT} target="_blank" rel="noreferrer" className="btn sm">
            Consultar NIT (RUES)
          </a>
        )}
      </div>

      {sinBorrar ? (
        <div className="form">
          {error && (
            <p className="form-err" role="alert">
              {error}
            </p>
          )}
          <button type="button" className="btn danger" onClick={borrarFotos} disabled={ocupado}>
            {ocupado ? "Borrando…" : "Borrar las fotos"}
          </button>
        </div>
      ) : rechazando ? (
        <div className="form">
          <div className="chips" role="group" aria-label="Motivos frecuentes">
            {MOTIVOS_RECHAZO.filter((m) => v.tipo === "compania" || !m.includes("NIT")).map((m) => (
              <button key={m} type="button" className="chip" aria-pressed={motivo === m} onClick={() => setMotivo(m)}>
                {m}
              </button>
            ))}
          </div>
          <div className="field">
            <label htmlFor={`motivo-${v.id}`}>Motivo (lo verá la persona)</label>
            <textarea id={`motivo-${v.id}`} value={motivo} onChange={(e) => setMotivo(e.target.value.slice(0, 300))} />
          </div>
          {error && (
            <p className="form-err" role="alert">
              {error}
            </p>
          )}
          <div className="row-actions">
            <button type="button" className="btn danger solid" onClick={() => resolver(false)} disabled={ocupado}>
              {ocupado ? "Guardando…" : "Confirmar rechazo"}
            </button>
            <button type="button" className="link-btn" onClick={() => setRechazando(false)}>
              Volver
            </button>
          </div>
        </div>
      ) : (
        <div className="form">
          {error && (
            <p className="form-err" role="alert">
              {error}
            </p>
          )}
          <div className="verif-botones">
            <button type="button" className="btn" onClick={() => setRechazando(true)} disabled={ocupado}>
              Rechazar
            </button>
            <button type="button" className="btn primary" onClick={() => resolver(true)} disabled={ocupado}>
              {ocupado ? "Guardando…" : "Aprobar"}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
