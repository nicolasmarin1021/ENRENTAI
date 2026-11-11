import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { TarjetaFlujo, TiraPasos } from "@/components/entregas/tarjeta-flujo";
import { cargarFlujos } from "@/lib/entregas-servidor";
import { getSesion } from "@/lib/sesion";

export const metadata: Metadata = { title: "Entregas" };

export default function Entregas() {
  return (
    <section className="pagina-media">
      <div className="page-hd">
        <div>
          <h1 className="title-lg">Entregas y devoluciones</h1>
          <p className="muted">
            El mismo proceso para cada reserva: fotos y lista de chequeo al salir de bodega, al recibir, al devolver y en
            la revisión final. Si algo no cuadra, abre un caso y ENRENTA te ayuda.
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
  if (!s) {
    return (
      <div className="card">
        <p>Entra con tu cuenta para ver tus entregas.</p>
        <Link href="/necesito" className="btn primary">Entrar</Link>
      </div>
    );
  }
  const datos = await cargarFlujos("cliente", { cliente: s.id });
  if (!datos.ok) return <p className="form-err">{datos.mensaje}</p>;
  const { ahora } = datos;

  if (!datos.activos.length && !datos.cerrados.length) {
    return (
      <div className="empty">
        <h2>Aún no tienes entregas</h2>
        <p className="muted">Cuando una compañía confirme tu reserva, aquí registras la recepción y la devolución con fotos.</p>
        <Link href="/explorar" className="btn primary">Ir a Explorar</Link>
      </div>
    );
  }
  return (
    <>
      <section className="bk-list" aria-label="En curso y por recibir">
        {datos.activos.length ? (
          datos.activos.map((f) => <TarjetaFlujo key={f.id} f={f} lado="cliente" ahora={ahora} />)
        ) : (
          <p className="vacio">No tienes entregas en curso.</p>
        )}
      </section>
      {datos.cerrados.length > 0 && (
        <section className="bk-list" aria-label="Cerradas">
          <div className="sec-hd">
            <h2>Cerradas</h2>
          </div>
          {datos.cerrados.map((f) => (
            <TarjetaFlujo key={f.id} f={f} lado="cliente" ahora={ahora} />
          ))}
        </section>
      )}
    </>
  );
}
