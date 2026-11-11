import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { TarjetaFlujo } from "@/components/entregas/tarjeta-flujo";
import { SELECT_RESERVA, TarjetaReserva, type ReservaFila } from "@/components/tarjeta-reserva";
import type { Lado } from "@/lib/entregas";
import { cargarFlujos } from "@/lib/entregas-servidor";
import { getSesion } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Entrega y casos" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function PaginaReserva({ params, searchParams }: PageProps<"/reservas/[id]">) {
  return (
    <section className="pagina-media">
      <Suspense fallback={<p className="muted">Cargando la reserva…</p>}>
        <Contenido params={params} searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function Contenido({ params, searchParams }: Pick<PageProps<"/reservas/[id]">, "params" | "searchParams">) {
  const [{ id }, sp, s] = await Promise.all([params, searchParams, getSesion()]);
  if (!s) {
    return (
      <div className="card">
        <p>Entra con tu cuenta para ver esta reserva.</p>
        <Link href="/necesito" className="btn primary">Entrar</Link>
      </div>
    );
  }
  const noEncontrada = (
    <div className="card">
      <p>No encontramos esa reserva.</p>
      <Link href="/necesito/reservas" className="btn primary">Ver mis reservas</Link>
    </div>
  );
  if (!UUID.test(id)) return noEncontrada;

  const supabase = await createClient();
  const { data: r } = await supabase.from("reservas").select(SELECT_RESERVA + ", cliente, compania_id").eq("id", id).maybeSingle();
  const reserva = r as unknown as (ReservaFila & { cliente: string; compania_id: string }) | null;
  if (!reserva) return noEncontrada;

  // Una misma cuenta puede ser el cliente y la compañía (p. ej. al probar con tu propio equipo):
  // si llegas desde "Tengo equipos" (?de=tengo) actúas como la compañía.
  const esCliente = reserva.cliente === s.id;
  const esCompania = s.compania?.id === reserva.compania_id;
  const lado: Lado = esCompania && (sp.de === "tengo" || !esCliente) ? "compania" : "cliente";
  const volver =
    lado === "cliente" ? { href: "/necesito/entregas", texto: "Mis entregas" } : { href: "/tengo/reservas", texto: "Entregas" };

  const conEntregas = ["confirmada", "en_curso", "completada"].includes(reserva.estado);
  const datos = conEntregas ? await cargarFlujos(lado, { reserva: reserva.id }) : null;
  const flujo = datos?.ok ? [...datos.activos, ...datos.cerrados][0] : undefined;

  return (
    <>
      <Link href={volver.href} className="back-link">
        ← {volver.texto}
      </Link>
      <TarjetaReserva r={reserva} vista={lado} enlace={false} />
      {datos && !datos.ok && <p className="form-err">{datos.mensaje}</p>}
      {flujo && (
        <>
          <div className="page-hd">
            <div>
              <h2 className="title-lg">Entrega y devolución</h2>
              <p className="muted">Cuatro pasos con fotos para que ambas partes tengan constancia de cómo sale y vuelve el equipo.</p>
            </div>
          </div>
          <TarjetaFlujo f={flujo} lado={lado} ahora={datos?.ok ? datos.ahora : 0} enlace={false} />
        </>
      )}
    </>
  );
}
