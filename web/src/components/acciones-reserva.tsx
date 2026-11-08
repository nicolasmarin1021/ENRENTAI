"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// El cliente cancela su reserva (pendiente o confirmada, antes de la entrega).
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
      setError(e.message || "No pudimos cancelar la reserva.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="row-actions">
      {confirmar ? (
        <>
          <button type="button" className="btn danger solid sm" onClick={cancelar} disabled={ocupado}>
            {ocupado ? "Cancelando…" : "Sí, cancelar reserva"}
          </button>
          <button type="button" className="link-btn" onClick={() => setConfirmar(false)} disabled={ocupado}>
            No, mantenerla
          </button>
        </>
      ) : (
        <button type="button" className="btn danger sm" onClick={() => setConfirmar(true)}>
          Cancelar reserva
        </button>
      )}
      {error && <span className="form-err" role="alert">{error}</span>}
    </div>
  );
}

// La compañía acepta o rechaza una solicitud pendiente.
export function ResponderReserva({ id }: { id: string }) {
  const router = useRouter();
  const [rechazando, setRechazando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");

  async function responder(aceptar: boolean) {
    setOcupado(true);
    setError("");
    const { error: e } = await createClient().rpc("responder_reserva", {
      p_id: id,
      p_aceptar: aceptar,
      p_motivo: aceptar ? null : motivo.trim() || null,
    });
    setOcupado(false);
    if (e) {
      setError(e.message || "No pudimos guardar tu respuesta.");
      return;
    }
    router.refresh();
  }

  if (rechazando) {
    return (
      <div className="form">
        <div className="field">
          <label htmlFor={`motivo-${id}`}>Motivo (opcional, lo ve el cliente)</label>
          <input
            id={`motivo-${id}`}
            maxLength={500}
            placeholder="Ej.: ese fin de semana el equipo está en mantenimiento"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </div>
        <div className="row-actions">
          <button type="button" className="btn danger solid" onClick={() => responder(false)} disabled={ocupado}>
            {ocupado ? "Enviando…" : "Rechazar solicitud"}
          </button>
          <button type="button" className="link-btn" onClick={() => setRechazando(false)} disabled={ocupado}>
            Volver
          </button>
        </div>
        {error && <p className="form-err" role="alert">{error}</p>}
      </div>
    );
  }

  return (
    <div className="row-actions">
      <button type="button" className="btn primary" onClick={() => responder(true)} disabled={ocupado}>
        {ocupado ? "Enviando…" : "Aceptar reserva"}
      </button>
      <button type="button" className="btn danger" onClick={() => setRechazando(true)} disabled={ocupado}>
        Rechazar
      </button>
      {error && <span className="form-err" role="alert">{error}</span>}
    </div>
  );
}
