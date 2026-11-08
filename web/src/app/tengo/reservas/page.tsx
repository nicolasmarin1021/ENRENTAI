import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SELECT_RESERVA, TarjetaReserva, type ReservaFila } from "@/components/tarjeta-reserva";
import { getSesion } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Entregas y reservas" };

export default function Reservas() {
  return (
    <section className="page-mid">
      <h1 className="title-lg">Entregas y reservas</h1>
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
  const pendientes = todas.filter((r) => r.estado === "pendiente");
  const proximas = todas.filter((r) => r.estado === "confirmada" || r.estado === "en_curso");
  const historial = todas
    .filter((r) => !["pendiente", "confirmada", "en_curso"].includes(r.estado))
    .reverse();

  if (!todas.length) {
    return (
      <div className="empty">
        <h2>Aún no tienes reservas</h2>
        <p className="muted">Cuando un cliente solicite tus equipos, la solicitud aparece aquí para que la aceptes o la rechaces.</p>
      </div>
    );
  }
  return (
    <>
      <Seccion titulo="Por responder" vacia="No tienes solicitudes pendientes." lista={pendientes} />
      <Seccion titulo="Confirmadas" vacia="No tienes reservas confirmadas." lista={proximas} />
      {historial.length > 0 && <Seccion titulo="Historial" vacia="" lista={historial} />}
    </>
  );
}

function Seccion({ titulo, vacia, lista }: { titulo: string; vacia: string; lista: ReservaFila[] }) {
  return (
    <section className="eq-list" aria-label={titulo}>
      <h2 className="sec-titulo">
        {titulo} {lista.length > 0 && <span className="tag">{lista.length}</span>}
      </h2>
      {lista.length ? lista.map((r) => <TarjetaReserva key={r.id} r={r} vista="compania" />) : <p className="muted">{vacia}</p>}
    </section>
  );
}
