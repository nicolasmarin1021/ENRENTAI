import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SELECT_RESERVA, type ReservaFila } from "@/components/tarjeta-reserva";
import { PanelVista, type BloqueoPanel } from "@/components/tengo/panel-vista";
import { SELECT_RESENA, type Resena } from "@/lib/resenas";
import { getSesion } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Panel" };

// Las solicitudes que se ven arriba en el panel: las por confirmar y las rentadas que aún no terminan.
const visibleEnPanel = (r: ReservaFila) =>
  r.estado === "pendiente" || ((r.estado === "confirmada" || r.estado === "en_curso") && Date.parse(r.recogida) >= Date.now());

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
  const [{ data: c }, resRes, { data: eqs }, bloqRes, { data: rs }] = await Promise.all([
    supabase.from("companias").select("*").eq("id", cid).single(),
    supabase.from("reservas").select(SELECT_RESERVA).eq("compania_id", cid).order("entrega"),
    supabase.from("equipos").select("id, unidades").eq("compania_id", cid),
    supabase.from("bloqueos").select("equipo_id, cantidad, desde, hasta"),
    // Si las reseñas aún no existen en la base de datos (falta 0009), la lista queda vacía.
    supabase.from("resenas").select(SELECT_RESENA).eq("compania_id", cid).order("creado", { ascending: false }).limit(20),
  ]);
  if (!c) return <p className="form-err">No pudimos cargar tu compañía. Recarga la página.</p>;

  // Clientes con la identidad verificada (SQL 0012), solo de las solicitudes que se ven arriba.
  const reservas = (resRes.data ?? []) as unknown as ReservaFila[];
  const perfiles = await Promise.all(
    reservas.filter(visibleEnPanel).map(async (r) => {
      const { data } = await supabase.rpc("perfil_de_solicitud", { p_reserva: r.id });
      return (data as { identidad_verificada?: boolean } | null)?.identidad_verificada ? r.id : null;
    }),
  );
  const verificados = perfiles.filter((id): id is string => id !== null);

  return (
    <PanelVista
      c={c}
      reservas={reservas}
      equipos={(eqs ?? []) as { id: string; unidades: number }[]}
      bloqueos={(bloqRes.data ?? []) as BloqueoPanel[]}
      resenas={(rs ?? []) as Resena[]}
      verificados={verificados}
    />
  );
}
