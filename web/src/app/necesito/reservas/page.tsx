import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SELECT_RESERVA, TarjetaReserva, type ReservaFila } from "@/components/tarjeta-reserva";
import { getSesion } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mis solicitudes" };

const ACTIVAS = ["pendiente", "confirmada", "en_curso"];
// Activa: por confirmar o rentada y todavía no ha pasado la recogida (las ya terminadas van al historial).
const esActiva = (r: ReservaFila) => ACTIVAS.includes(r.estado) && Date.parse(r.recogida) >= Date.now();
const RENTADA = ["confirmada", "en_curso", "completada"];

export default function MisReservas({ searchParams }: PageProps<"/necesito/reservas">) {
  return (
    <section className="pagina-media">
      <Suspense fallback={<p className="muted">Cargando tus solicitudes…</p>}>
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
        <p>Entra con tu correo para ver tus solicitudes.</p>
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
        <h1 className="title-lg">Mis solicitudes</h1>
        <p className="muted">
          Las cotizaciones que pediste por WhatsApp{s.nombre ? `, ${s.nombre}` : ""}. Cuando la compañía marca una como
          rentada, el equipo queda apartado para ti.
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
            : "No pudimos cargar tus solicitudes. Recarga la página."}
        </p>
      </>
    );
  }
  const todas = (data ?? []) as unknown as ReservaFila[];
  const activas = todas.filter(esActiva);
  const pasadas = todas.filter((r) => !esActiva(r)).reverse();
  const lista = historial ? pasadas : activas;

  // Reseñas que ya dejó (si las reseñas aún no existen en la base de datos, no se muestran).
  const rentadas = todas.filter((r) => RENTADA.includes(r.estado)).map((r) => r.id);
  const { data: rs } = rentadas.length
    ? await supabase.from("resenas").select("reserva_id, estrellas, comentario").in("reserva_id", rentadas)
    : { data: [] };
  const resenas = new Map(
    ((rs ?? []) as { reserva_id: string; estrellas: number; comentario: string | null }[]).map((x) => [x.reserva_id, x]),
  );

  return (
    <>
      {encabezado}
      {!historial && pasadas.some((r) => RENTADA.includes(r.estado) && !resenas.has(r.id)) && (
        <p className="note">
          Tienes rentas que ya terminaron sin calificar.{" "}
          <Link href="/necesito/reservas?ver=historial">Califica a la compañía</Link> para ayudar a otros clientes.
        </p>
      )}
      <nav className="seg-tabs" aria-label="Ver solicitudes">
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
            <TarjetaReserva key={r.id} r={r} vista="cliente" resena={resenas.get(r.id) ?? null} />
          ))}
        </div>
      ) : (
        <div className="card empty-rider">
          <p className="muted">
            {historial
              ? "Aquí verás las rentas que ya terminaron (para calificar a la compañía), las que no se concretaron y las que cancelaste."
              : "No tienes solicitudes activas."}
          </p>
          {!historial && <Link href="/explorar" className="btn primary">Buscar equipos</Link>}
        </div>
      )}
    </>
  );
}
