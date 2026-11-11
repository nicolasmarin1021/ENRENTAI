import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BotonSalir, EntrarConCodigo, FormNombre } from "@/components/entrar";
import { getSesion } from "@/lib/sesion";
import { supabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Necesito equipos" };

export default function Necesito({ searchParams }: PageProps<"/necesito">) {
  return (
    <section className="page-narrow">
      <Link href="/" className="back-link">← Volver</Link>
      <Suspense fallback={<Titulo />}>
        <Entrada searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

function Titulo({ nombre }: { nombre?: string }) {
  return (
    <>
      <h1 className="title-xl">
        {nombre ? <>Hola, <em>{nombre.split(" ")[0]}</em></> : <>Entra para <em>rentar</em></>}
      </h1>
      <p className="lead">
        {nombre
          ? "Arma tu pedido, revisa disponibilidad en el mapa y sigue tus reservas."
          : "Con tu cuenta pagas, sigues tus reservas y chateas con las compañías."}
      </p>
    </>
  );
}

async function Entrada({ searchParams }: Pick<PageProps<"/necesito">, "searchParams">) {
  const [s, sp] = await Promise.all([getSesion(), searchParams]);

  if (!supabaseConfigured) {
    return (
      <>
        <Titulo />
        <p className="note">Las cuentas se activan cuando la app esté conectada a Supabase (archivo web/.env.local).</p>
      </>
    );
  }

  if (s && !s.nombre) {
    return (
      <>
        <Titulo />
        <FormNombre uid={s.id} modo="necesito" />
      </>
    );
  }

  if (s) {
    return (
      <>
        <Titulo nombre={s.nombre} />
        <div className="card">
          <p className="muted">
            Entraste como <b>{s.correo}</b>.
          </p>
          <Link href="/explorar" className="btn primary lg block">Continuar</Link>
          <div className="row-actions">
            <Link href="/necesito/reservas" className="link-btn">Mis reservas</Link>
            <BotonSalir texto="Entrar con otro correo" />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Titulo />
      {sp.enlace === "vencido" && (
        <p className="form-err" role="alert">Ese enlace ya venció o ya se usó. Pide un código nuevo.</p>
      )}
      <EntrarConCodigo modo="necesito" />
      <Link href="/explorar" className="link-btn" style={{ justifySelf: "center" }}>
        Explorar sin cuenta por ahora
      </Link>
    </>
  );
}
