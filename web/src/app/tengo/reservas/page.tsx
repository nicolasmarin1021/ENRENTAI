import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SELECT_RESERVA, TarjetaReserva, type ReservaFila } from "@/components/tarjeta-reserva";
import { getSesion } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Entregas" };

export default function Entregas() {
  return (
    <section className="pagina-media">
      <div className="page-hd">
        <div>
          <h1 className="title-lg">Entregas y devoluciones</h1>
          <p className="muted">Registra con fotos la salida de bodega y la revisión final de cada reserva.</p>
        </div>
      </div>
      <Suspense fallback={<p className="muted">Cargando reservas…</p>}>
        <Lista />
      </Suspense>
    </section>
  );
}

async function Lista() {
  const s = await getSesion();
  if (!s?.compania) {
    return (
      <div className="card">
        <p>Primero registra tu compañía.</p>
        <Link href="/tengo/registro" className="btn primary">Registrar mi compañía</Link>
      </div>
    );
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reservas")
    .select(SELECT_RESERVA)
    .eq("compania_id", s.compania.id)
    .order("entrega", { ascending: true });

  if (error) {
    return (
      <p className="form-err">
        {error.code === "PGRST205" || error.code === "42P01"
          ? "Las reservas aún no están activadas: falta ejecutar el SQL 0003_reservas.sql en Supabase."
          : "No pudimos cargar las reservas. Recarga la página."}
      </p>
    );
  }
  const todas = (data ?? []) as unknown as ReservaFila[];
  const pendientes = todas.filter((r) => r.estado === "pendiente").length;
  const activas = todas.filter((r) => r.estado === "confirmada" || r.estado === "en_curso");
  const historial = todas.filter((r) => ["completada", "cancelada", "rechazada"].includes(r.estado)).reverse();

  return (
    <>
      {pendientes > 0 && (
        <p className="note">
          Tienes {pendientes} {pendientes === 1 ? "solicitud" : "solicitudes"} por responder.{" "}
          <Link href="/tengo/panel">Respóndelas en tu panel</Link>
        </p>
      )}
      <section className="bk-list" aria-label="Por salir y en curso">
        <div className="sec-hd">
          <h2>Por salir y en curso</h2>
          <span className="fine">Salida con fotos, devolución y revisión final</span>
        </div>
        {activas.length ? (
          activas.map((r) => <TarjetaReserva key={r.id} r={r} vista="compania" />)
        ) : (
          <p className="vacio">No tienes entregas pendientes.</p>
        )}
      </section>
      {historial.length > 0 && (
        <section className="bk-list" aria-label="Historial">
          <div className="sec-hd">
            <h2>Historial</h2>
          </div>
          {historial.map((r) => (
            <TarjetaReserva key={r.id} r={r} vista="compania" />
          ))}
        </section>
      )}
    </>
  );
}
