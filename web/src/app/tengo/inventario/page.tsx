import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { InventarioVista, type Bloqueo, type Equipo, type Reserva } from "@/components/tengo/inventario-vista";
import { esYMD, hoyCO, inicioCO } from "@/lib/agenda";
import { getSesion } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Inventario y agenda" };


export default function Inventario({ searchParams }: PageProps<"/tengo/inventario">) {
  return (
    <section className="pagina-ancha">
      <div className="page-hd">
        <div>
          <h1 className="title-lg">Inventario y agenda</h1>
          <p className="muted">
            Unidades libres por día para los próximos 14 días. Las reservas pendientes ya apartan stock; los bloqueos
            sirven para mantenimiento o uso propio.
          </p>
        </div>
      </div>
      <Suspense fallback={<p className="muted">Cargando tu inventario…</p>}>
        <Contenido searchParams={searchParams} />
      </Suspense>
    </section>
  );
}


async function Contenido({ searchParams }: Pick<PageProps<"/tengo/inventario">, "searchParams">) {
  const [sp, s] = await Promise.all([searchParams, getSesion()]);
  if (!s?.compania) {
    return (
      <div className="card">
        <p>Primero registra tu compañía.</p>
        <Link href="/tengo/registro" className="btn primary">Registrar mi compañía</Link>
      </div>
    );
  }
  const hoy = hoyCO();
  const pedido = typeof sp.desde === "string" && esYMD(sp.desde) ? sp.desde : hoy;
  const desde = pedido < hoy ? hoy : pedido;
  const preBloqueo = typeof sp.bloquear === "string" ? sp.bloquear : null;

  const supabase = await createClient();
  const cid = s.compania.id;
  const [eqRes, resRes, bloqRes] = await Promise.all([
    supabase
      .from("equipos")
      .select("id, nombre, unidades, precio_dia, activo, banda_nombre, banda_min_mhz, banda_max_mhz, equipo_fotos(id)")
      .eq("compania_id", cid)
      .order("creado"),
    supabase
      .from("reservas")
      .select("id, codigo, estado, entrega, recogida, modalidad, lugar_nombre, reserva_items(equipo_id, nombre, cantidad)")
      .eq("compania_id", cid)
      .in("estado", ["pendiente", "confirmada", "en_curso"])
      .gte("recogida", inicioCO(hoy).toISOString())
      .order("entrega"),
    supabase.from("bloqueos").select("id, equipo_id, cantidad, desde, hasta, motivo").gte("hasta", new Date().toISOString()).order("desde"),
  ]);
  const equipos = (eqRes.data ?? []) as Equipo[];
  const reservas = (resRes.data ?? []) as Reserva[];
  const bloqueos = (bloqRes.data ?? []) as Bloqueo[];
  const sinBloqueos = Boolean(bloqRes.error);

  return (
    <InventarioVista
      equipos={equipos}
      reservas={reservas}
      bloqueos={bloqueos}
      sinBloqueos={sinBloqueos}
      desde={desde}
      hoy={hoy}
      preBloqueo={preBloqueo}
    />
  );
}
