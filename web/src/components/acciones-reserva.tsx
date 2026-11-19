"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { enlaceWhatsApp, prepararPestana } from "@/lib/whatsapp";

// El cliente cancela su solicitud (por confirmar o rentada, antes de la entrega).
export function CancelarReserva({ id }: { id: string }) {
  const router = useRouter();
  const [confirmar, setConfirmar] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");

  async function cancelar() {
    setOcupado(true);
    const { error: e } = await createClient().rpc("cancelar_reserva", { p_id: id });
    setOcupado(false);
    if (e) {
      setError(e.message || "No pudimos cancelar la solicitud.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="row-actions">
      {confirmar ? (
        <>
          <button type="button" className="btn danger solid" onClick={cancelar} disabled={ocupado}>
            {ocupado ? "Cancelando…" : "Sí, cancelar solicitud"}
          </button>
          <button type="button" className="link-btn" onClick={() => setConfirmar(false)} disabled={ocupado}>
            No, mantenerla
          </button>
        </>
      ) : (
        <button type="button" className="btn danger" onClick={() => setConfirmar(true)}>
          Cancelar solicitud
        </button>
      )}
      {error && <span className="form-err" role="alert">{error}</span>}
    </div>
  );
}

// La compañía marca la solicitud: "Rentada" (aparta el equipo en su agenda) o "No se concretó".
export function ResponderReserva({ id }: { id: string }) {
  const router = useRouter();
  const [noConcreto, setNoConcreto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");

  async function responder(rentada: boolean) {
    setOcupado(true);
    setError("");
    const { error: e } = await createClient().rpc("responder_reserva", {
      p_id: id,
      p_aceptar: rentada,
      p_motivo: rentada ? null : motivo.trim() || null,
    });
    setOcupado(false);
    if (e) {
      setError(e.message || "No pudimos guardar. Intenta de nuevo.");
      return;
    }
    router.refresh();
  }

  if (noConcreto) {
    return (
      <div className="form">
        <div className="field">
          <label htmlFor={`motivo-${id}`}>Motivo (opcional, lo ve el cliente)</label>
          <input
            id={`motivo-${id}`}
            maxLength={500}
            placeholder="Ej.: ese fin de semana el equipo ya estaba comprometido"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </div>
        <div className="row-actions">
          <button type="button" className="btn danger solid" onClick={() => responder(false)} disabled={ocupado}>
            {ocupado ? "Guardando…" : "Marcar como no concretada"}
          </button>
          <button type="button" className="link-btn" onClick={() => setNoConcreto(false)} disabled={ocupado}>
            Volver
          </button>
        </div>
        {error && <p className="form-err" role="alert">{error}</p>}
      </div>
    );
  }

  return (
    <>
      {error && <span className="form-err" role="alert">{error}</span>}
      <button type="button" className="btn" onClick={() => setNoConcreto(true)} disabled={ocupado}>
        No se concretó
      </button>
      <button type="button" className="btn primary" onClick={() => responder(true)} disabled={ocupado}>
        {ocupado ? "Guardando…" : "Marcar como rentada"}
      </button>
    </>
  );
}

// El cliente vuelve a escribirle a la compañía por WhatsApp sobre una solicitud.
export function EscribirWhatsApp({ id, codigo, compania }: { id: string; codigo: string; compania: string }) {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");

  async function abrir() {
    const pestana = prepararPestana();
    setOcupado(true);
    setError("");
    const { data, error: e } = await createClient().rpc("whatsapp_de_solicitud", { p_id: id });
    setOcupado(false);
    if (e || typeof data !== "string" || !data) {
      pestana.cerrar();
      setError(
        e?.code === "PGRST202"
          ? "Falta ejecutar el SQL 0008_beta_conexion.sql en Supabase."
          : "No encontramos el WhatsApp de la compañía.",
      );
      return;
    }
    pestana.ir(enlaceWhatsApp(data, `Hola ${compania}, te escribo por la solicitud ${codigo} de ENRENTA.`));
  }

  return (
    <>
      {error && <span className="form-err" role="alert">{error}</span>}
      <button type="button" className="btn whatsapp" onClick={abrir} disabled={ocupado}>
        {ocupado ? "Abriendo…" : "Escribir por WhatsApp"}
      </button>
    </>
  );
}
