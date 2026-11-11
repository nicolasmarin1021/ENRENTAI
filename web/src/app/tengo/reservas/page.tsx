import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { TarjetaFlujo, TiraPasos } from "@/components/entregas/tarjeta-flujo";
import { cargarFlujos } from "@/lib/entregas-servidor";
import { getSesion } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Entregas" };

export default function Entregas() {
  return (
    <section className="pagina-media">
      <div className="page-hd">
        <div>
          <h1 className="title-lg">Entregas y devoluciones</h1>
          <p className="muted">
            El mismo proceso para cada reserva: fotos y lista de chequeo al salir de bodega, al recibir, al devolver y en
            la revisión final. Si algo no cuadra, abre un caso y ENRENTA ayuda a resolverlo.
          </p>
        </div>
      </div>
      <TiraPasos />
      <Suspense fallback={<p className="muted">Cargando tus entregas…</p>}>
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
  const [datos, { count: pendientes }] = await Promise.all([
    cargarFlujos("compania", { compania: s.compania.id }),
    supabase
      .from("reservas")
      .select("id", { count: "exact", head: true })
      .eq("compania_id", s.compania.id)
      .eq("estado", "pendiente"),
  ]);
  if (!datos.ok) return <p className="form-err">{datos.mensaje}</p>;
  const { ahora } = datos;

  return (
    <>
      {(pendientes ?? 0) > 0 && (
        <p className="note">
          Tienes {pendientes} {pendientes === 1 ? "solicitud" : "solicitudes"} por responder.{" "}
          <Link href="/tengo/panel">Respóndelas en tu panel</Link>
        </p>
      )}
      <section className="bk-list" aria-label="Por salir y en curso">
        <div className="sec-hd">
          <h2>Por salir y en curso</h2>
          <span className="fine">Salida con fotos, recepción, devolución y revisión final</span>
        </div>
        {datos.activos.length ? (
          datos.activos.map((f) => <TarjetaFlujo key={f.id} f={f} lado="compania" ahora={ahora} />)
        ) : (
          <p className="vacio">No tienes entregas pendientes. Las reservas aparecen aquí cuando las confirmas.</p>
        )}
      </section>
      {datos.cerrados.length > 0 && (
        <section className="bk-list" aria-label="Cerradas">
          <div className="sec-hd">
            <h2>Cerradas</h2>
          </div>
          {datos.cerrados.map((f) => (
            <TarjetaFlujo key={f.id} f={f} lado="compania" ahora={ahora} />
          ))}
        </section>
      )}
    </>
  );
}
