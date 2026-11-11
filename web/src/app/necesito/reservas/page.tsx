import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SELECT_RESERVA, TarjetaReserva, type ReservaFila } from "@/components/tarjeta-reserva";
import { getSesion } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mis reservas" };

const ACTIVAS = ["pendiente", "confirmada", "en_curso"];

export default function MisReservas({ searchParams }: PageProps<"/necesito/reservas">) {
  return (
    <section className="pagina-media">
      <Suspense fallback={<p className="muted">Cargando tus reservas…</p>}>
        <Lista searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function Lista({ searchParams }: Pick<PageProps<"/necesito/reservas">, "searchParams">) {
  const [sp, s] = await Promise.all([searchParams, getSesion()]);
  const historial = sp.ver === "historial";
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
    .order("entrega", { ascending: true });

  const encabezado = (
    <div className="page-hd">
      <div>
        <h1 className="title-lg">Mis reservas</h1>
        <p className="muted">
          Sigue cada solicitud{s.nombre ? ` de ${s.nombre}` : ""}: confirmación de la compañía, entrega, devolución y
          depósito.
        </p>
      </div>
    </div>
  );

  if (error) {
    return (
      <>
        {encabezado}
        <p className="form-err">
          {error.code === "PGRST205" || error.code === "42P01"
            ? "Las reservas aún no están activadas: falta ejecutar el SQL 0003_reservas.sql en Supabase."
            : "No pudimos cargar tus reservas. Recarga la página."}
        </p>
      </>
    );
  }
  const todas = (data ?? []) as unknown as ReservaFila[];
  const activas = todas.filter((r) => ACTIVAS.includes(r.estado));
  const pasadas = todas.filter((r) => !ACTIVAS.includes(r.estado)).reverse();
  const lista = historial ? pasadas : activas;

  return (
    <>
      {encabezado}
      <nav className="seg-tabs" aria-label="Ver reservas">
        <Link href="/necesito/reservas" aria-current={!historial ? "page" : undefined}>
          Activas · {activas.length}
        </Link>
        <Link href="/necesito/reservas?ver=historial" aria-current={historial ? "page" : undefined}>
          Historial · {pasadas.length}
        </Link>
      </nav>
      {lista.length ? (
        <div className="bk-list">
          {lista.map((r) => (
            <TarjetaReserva key={r.id} r={r} vista="cliente" />
          ))}
        </div>
      ) : (
        <div className="card empty-rider">
          <p className="muted">
            {historial ? "Aquí verás tus reservas cerradas, canceladas o rechazadas." : "No tienes reservas activas."}
          </p>
          {!historial && <Link href="/explorar" className="btn primary">Buscar equipos</Link>}
        </div>
      )}
    </>
  );
}
