"use client";

import { useEffect, useState } from "react";
import { aISO } from "./pedido";
import { createClient } from "./supabase/client";

// Unidades ya apartadas por otras reservas en las fechas del pedido, por equipo.
// Si la función aún no existe en la base de datos, se asume que todo está libre.
export function useOcupadas(entrega: string, recogida: string, version = 0) {
  const clave = entrega && recogida ? `${entrega}|${recogida}|${version}` : "";
  const [estado, setEstado] = useState<{ clave: string; mapa: Record<string, number> }>({ clave: "", mapa: {} });

  useEffect(() => {
    if (!clave) return;
    let vivo = true;
    createClient()
      .rpc("unidades_ocupadas", { p_desde: aISO(entrega), p_hasta: aISO(recogida) })
      .then(({ data, error }) => {
        if (!vivo) return;
        const mapa: Record<string, number> = {};
        if (!error && Array.isArray(data))
          for (const f of data as { equipo_id: string; ocupadas: number }[]) mapa[f.equipo_id] = f.ocupadas;
        setEstado({ clave, mapa });
      });
    return () => {
      vivo = false;
    };
  }, [clave, entrega, recogida]);

  return estado.clave === clave ? estado.mapa : {};
}
