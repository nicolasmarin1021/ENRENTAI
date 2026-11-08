"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

const MOTIVOS = ["Mantenimiento", "Uso propio", "Reparación", "Otro"];
const iso = (ymd: string, hora: string) => new Date(`${ymd}T${hora}:00-05:00`).toISOString();

// Formulario para apartar unidades de un equipo por unas fechas.
export function BloquearUnidades({
  equipos,
  inicial,
  hoy,
}: {
  equipos: { id: string; nombre: string; unidades: number }[];
  inicial: string | null; // equipo preseleccionado
  hoy: string;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(inicial !== null);
  const [equipo, setEquipo] = useState(inicial ?? equipos[0]?.id ?? "");
  const [cantidad, setCantidad] = useState(1);
  const [desde, setDesde] = useState(hoy);
  const [hasta, setHasta] = useState(hoy);
  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  const max = equipos.find((e) => e.id === equipo)?.unidades ?? 1;

  async function guardar(ev: FormEvent) {
    ev.preventDefault();
    if (!equipo) return setError("Elige el equipo.");
    if (hasta < desde) return setError("La fecha final debe ser igual o posterior a la inicial.");
    if (cantidad < 1 || cantidad > max) return setError(`Puedes bloquear entre 1 y ${max} unidades.`);
    setOcupado(true);
    setError("");
    const { error: e } = await createClient()
      .from("bloqueos")
      .insert({ equipo_id: equipo, cantidad, desde: iso(desde, "00:00"), hasta: iso(hasta, "23:59"), motivo });
    setOcupado(false);
    if (e) {
      setError(
        e.code === "PGRST205" || e.code === "42P01"
          ? "Los bloqueos aún no están activados: falta ejecutar el SQL 0005_bloqueos.sql en Supabase."
          : "No pudimos guardar el bloqueo. Intenta de nuevo.",
      );
      return;
    }
    setAbierto(false);
    router.replace("/tengo/inventario");
    router.refresh();
  }

  if (!abierto) {
    return (
      <button type="button" className="btn" onClick={() => setAbierto(true)} disabled={!equipos.length}>
        Bloquear unidades
      </button>
    );
  }

  return (
    <form id="bloquear" className="card form bloqueo-form" onSubmit={guardar} noValidate>
      <div className="sec-hd">
        <h2>Bloquear unidades</h2>
        <button type="button" className="cerrar" onClick={() => setAbierto(false)} aria-label="Cerrar">×</button>
      </div>
      <p className="fine">Las unidades bloqueadas no se pueden reservar en esas fechas (mantenimiento, uso propio…).</p>
      <div className="form-grid">
        <div className="field span2">
          <label htmlFor="bq-eq">Equipo</label>
          <select id="bq-eq" value={equipo} onChange={(e) => setEquipo(e.target.value)}>
            {equipos.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre} · {e.unidades} u
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="bq-cant">Unidades</label>
          <input id="bq-cant" type="number" inputMode="numeric" min={1} max={max} value={cantidad} onChange={(e) => setCantidad(Number(e.target.value))} />
        </div>
        <div className="field">
          <label htmlFor="bq-motivo">Motivo</label>
          <select id="bq-motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
            {MOTIVOS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="bq-desde">Desde</label>
          <input id="bq-desde" type="date" min={hoy} value={desde} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="bq-hasta">Hasta (incluido)</label>
          <input id="bq-hasta" type="date" min={desde} value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
      </div>
      {error && <p className="form-err" role="alert">{error}</p>}
      <div className="row-actions">
        <button type="submit" className="btn primary" disabled={ocupado}>
          {ocupado ? "Guardando…" : "Bloquear"}
        </button>
        <button type="button" className="link-btn" onClick={() => setAbierto(false)}>Cancelar</button>
      </div>
    </form>
  );
}

export function QuitarBloqueo({ id }: { id: string }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  return (
    <button
      type="button"
      className="btn sm"
      disabled={ocupado}
      onClick={async () => {
        setOcupado(true);
        await createClient().from("bloqueos").delete().eq("id", id);
        setOcupado(false);
        router.refresh();
      }}
    >
      {ocupado ? "Quitando…" : "Quitar"}
    </button>
  );
}
