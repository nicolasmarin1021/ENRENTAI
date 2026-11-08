import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BotonSalir, EntrarConCodigo, FormNombre } from "@/components/entrar";
import { getSesion } from "@/lib/sesion";
import { supabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Tengo equipos" };

export default function Tengo({ searchParams }: PageProps<"/tengo">) {
  return (
    <section className="page-narrow">
      <Link href="/" className="back-link">← Volver</Link>
      <Suspense fallback={<Titulo />}>
        <Entrada searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

function Titulo({ hola }: { hola?: string }) {
  return (
    <>
      <h1 className="title-xl">
        {hola ? <>Hola, <em>{hola}</em></> : <>Entra con tu <em>compañía</em></>}
      </h1>
      <p className="lead">
        {hola
          ? "Tu panel, tu inventario y tus mensajes te esperan."
          : "Publica tu inventario, responde solicitudes y coordina entregas en Medellín."}
      </p>
    </>
  );
}

async function Entrada({ searchParams }: Pick<PageProps<"/tengo">, "searchParams">) {
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
        <FormNombre uid={s.id} modo="tengo" />
      </>
    );
  }

  if (s?.compania) {
    return (
      <>
        <Titulo hola={s.compania.nombre} />
        <div className="card">
          <Link href="/tengo/panel" className="btn primary lg block">Ir a mi panel</Link>
          <div className="row-actions">
            <BotonSalir texto="Entrar con otra compañía" />
          </div>
        </div>
      </>
    );
  }

  if (s) {
    return (
      <>
        <Titulo hola={s.nombre.split(" ")[0]} />
        <div className="card">
          <h2>Registra tu compañía</h2>
          <p className="muted">
            Entraste como <b>{s.correo}</b>. Falta crear el perfil de tu compañía con la dirección de la bodega para
            empezar a publicar equipos.
          </p>
          <Link href="/tengo/registro" className="btn primary lg block">Registrar mi compañía</Link>
          <div className="row-actions">
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
      <EntrarConCodigo modo="tengo" />
      <p className="fine">
        Después de entrar registras la bodega y tu inventario. ENRENTA revisa los datos antes de mostrar el sello de
        compañía verificada.
      </p>
    </>
  );
}
