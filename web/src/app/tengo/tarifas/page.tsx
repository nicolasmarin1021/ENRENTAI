import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { TarifasVista } from "@/components/tengo/tarifas-vista";
import { getSesion } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Tarifas" };

export default function PaginaTarifas() {
  return (
    <section className="pagina-ancha">
      <div className="page-hd">
        <div>
          <h1 className="title-lg">Tarifas</h1>
          <p className="muted">
            Define cómo cobras el depósito, el transporte y el técnico. Los precios por día de cada equipo se editan en{" "}
            <Link href="/tengo/inventario">Inventario</Link>. Los cambios aplican a las solicitudes nuevas; las reservas
            que ya existen conservan sus valores.
          </p>
        </div>
      </div>
      <Suspense fallback={<p className="muted">Cargando tus tarifas…</p>}>
        <Contenido />
      </Suspense>
    </section>
  );
}

async function Contenido() {
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
  const { data: c } = await supabase
    .from("companias")
    .select(
      "id, deposito_pct, cobertura_km, transporte_modo, transporte_fijo, transporte_base, transporte_km, " +
        "tecnico_nombre, tecnico_tarifa_dia, direccion_bodega, horario_bodega",
    )
    .eq("id", s.compania.id)
    .single<{
      id: string;
      deposito_pct: number | string;
      cobertura_km: number;
      transporte_modo: "fijo" | "variable";
      transporte_fijo: number;
      transporte_base: number;
      transporte_km: number;
      tecnico_nombre: string | null;
      tecnico_tarifa_dia: number | null;
      direccion_bodega: string | null;
      horario_bodega: string | null;
    }>();
  if (!c) return <p className="form-err">No pudimos cargar tus tarifas. Recarga la página.</p>;
  return <TarifasVista inicial={{ ...c, deposito_pct: Number(c.deposito_pct) }} />;
}
