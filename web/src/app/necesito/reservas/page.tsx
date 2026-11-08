import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SELECT_RESERVA, TarjetaReserva, type ReservaFila } from "@/components/tarjeta-reserva";
import { getSesion } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mis reservas" };

export default function MisReservas() {
  return (
    <section className="page-mid">
      <Link href="/explorar" className="back-link">← Explorar</Link>
      <h1 className="title-lg">Mis reservas</h1>
      <Suspense fallback={<p className="muted">Cargando tus reservas…</p>}>
        <Lista />
      </Suspense>
    </section>
  );
}

async function Lista() {
  const s = await getSesion();
  if (!s) {
    return (
      <div className="card">
        <p>Entra con tu correo para ver tus reservas.</p>
        <Link href="/necesito" className="btn primary">Entrar</Link>
      </div>
    );
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reservas")
    .select(SELECT_RESERVA)
    .eq("cliente", s.id)
    .order("creado", { ascending: false });

  if (error) {
    return (
      <p className="form-err">
        {error.code === "PGRST205" || error.code === "42P01"
          ? "Las reservas aún no están activadas: falta ejecutar el SQL 0003_reservas.sql en Supabase."
          : "No pudimos cargar tus reservas. Recarga la página."}
      </p>
    );
  }
  const reservas = (data ?? []) as unknown as ReservaFila[];
  if (!reservas.length) {
    return (
      <div className="empty">
        <h2>Aún no tienes reservas</h2>
        <p className="muted">Arma tu pedido en el mapa, agrega equipos a tu rider y solicita la reserva.</p>
        <Link href="/explorar" className="btn primary">Ir a Explorar</Link>
      </div>
    );
  }
  return (
    <div className="eq-list">
      {reservas.map((r) => (
        <TarjetaReserva key={r.id} r={r} vista="cliente" />
      ))}
    </div>
  );
}
