import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SELECT_RESERVA, type ReservaFila } from "@/components/tarjeta-reserva";
import { PanelVista, type BloqueoPanel } from "@/components/tengo/panel-vista";
import { getSesion } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Panel" };

export default function Panel() {
  return (
    <section className="pagina-ancha">
      <Suspense fallback={<p className="muted">Cargando tu panel…</p>}>
        <Contenido />
      </Suspense>
    </section>
  );
}


async function Contenido() {
  const s = await getSesion();
  if (!s) {
    return (
      <div className="card">
        <p>Entra con el correo de tu compañía para ver tu panel.</p>
        <Link href="/tengo" className="btn primary">Entrar</Link>
      </div>
    );
  }
  if (!s.compania) {
    return (
      <div className="card">
        <p>Todavía no has registrado tu compañía.</p>
        <Link href="/tengo/registro" className="btn primary">Registrar mi compañía</Link>
      </div>
    );
  }

  const supabase = await createClient();
  const cid = s.compania.id;
  const [{ data: c }, resRes, { data: eqs }, bloqRes] = await Promise.all([
    supabase.from("companias").select("*").eq("id", cid).single(),
    supabase.from("reservas").select(SELECT_RESERVA).eq("compania_id", cid).order("entrega"),
    supabase.from("equipos").select("id, unidades").eq("compania_id", cid),
    supabase.from("bloqueos").select("equipo_id, cantidad, desde, hasta"),
  ]);
  if (!c) return <p className="form-err">No pudimos cargar tu compañía. Recarga la página.</p>;

  return (
    <PanelVista
      c={c}
      reservas={(resRes.data ?? []) as unknown as ReservaFila[]}
      equipos={(eqs ?? []) as { id: string; unidades: number }[]}
      bloqueos={(bloqRes.data ?? []) as BloqueoPanel[]}
    />
  );
}
