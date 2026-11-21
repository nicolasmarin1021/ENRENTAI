import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { hoyCO, inicioCO, type Movimiento } from "./agenda";
import { SELECT_RESERVA, type ReservaFila } from "./reservas";
import { supabase } from "./supabase";

// Datos de la compañía para su panel y su inventario: equipos, solicitudes y bloqueos.
// Se vuelven a leer cada vez que la persona entra a la pestaña.

export type EquipoInventario = {
  id: string;
  nombre: string;
  categoria_id: string;
  unidades: number;
  precio_dia: number;
  activo: boolean;
  banda_nombre: string | null;
  equipo_fotos: { ruta: string; orden: number }[];
};

export type Bloqueo = { id: string; equipo_id: string; cantidad: number; desde: string; hasta: string; motivo: string };

export type DatosCompania = {
  equipos: EquipoInventario[];
  reservas: ReservaFila[]; // todas las solicitudes de la compañía
  bloqueos: Bloqueo[]; // los que todavía no terminan
  resenas: { id: string; autor_nombre: string; estrellas: number; comentario: string | null; respuesta: string | null; creado: string }[];
};

const VACIO: DatosCompania = { equipos: [], reservas: [], bloqueos: [], resenas: [] };

export function useDatosCompania(cid: string) {
  const [datos, setDatos] = useState<DatosCompania>(VACIO);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [ahora, setAhora] = useState(() => Date.now());

  // silencioso: al volver a la pestaña se actualiza sin mostrar la ruedita de recarga.
  const recargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    const [eq, rs, bq, re] = await Promise.all([
      supabase
        .from("equipos")
        .select("id, nombre, categoria_id, unidades, precio_dia, activo, banda_nombre, equipo_fotos(ruta, orden)")
        .eq("compania_id", cid)
        .order("nombre"),
      supabase.from("reservas").select(SELECT_RESERVA).eq("compania_id", cid).order("entrega"),
      supabase.from("bloqueos").select("id, equipo_id, cantidad, desde, hasta, motivo").gte("hasta", new Date().toISOString()).order("desde"),
      supabase
        .from("resenas")
        .select("id, autor_nombre, estrellas, comentario, respuesta, creado")
        .eq("compania_id", cid)
        .order("creado", { ascending: false })
        .limit(30),
    ]);
    setError(eq.error || rs.error ? "No pudimos cargar tus datos. Desliza hacia abajo para intentar de nuevo." : "");
    setDatos({
      equipos: ((eq.data ?? []) as EquipoInventario[]).map((e) => ({ ...e, precio_dia: Number(e.precio_dia) })),
      reservas: (rs.data ?? []) as unknown as ReservaFila[],
      bloqueos: (bq.data ?? []) as Bloqueo[], // si falta el SQL 0005, simplemente no hay bloqueos
      resenas: (re.data ?? []) as DatosCompania["resenas"],
    });
    setAhora(Date.now());
    setCargando(false);
  }, [cid]);

  useFocusEffect(
    useCallback(() => {
      void recargar(true);
    }, [recargar]),
  );

  return { ...datos, cargando, error, recargar, ahora };
}

// Solo las rentadas (y los bloqueos) apartan equipo en la agenda.
export const esRentada = (r: ReservaFila) => r.estado === "confirmada" || r.estado === "en_curso";

export function movimientos(reservas: ReservaFila[], bloqueos: Bloqueo[]): Movimiento[] {
  const desdeHoy = +inicioCO(hoyCO());
  return [
    ...reservas
      .filter((r) => esRentada(r) && Date.parse(r.recogida) >= desdeHoy)
      .flatMap((r) => r.reserva_items.map((i) => ({ equipo_id: i.equipo_id, cantidad: i.cantidad, desde: r.entrega, hasta: r.recogida, bloqueo: false }))),
    ...bloqueos.map((b) => ({ equipo_id: b.equipo_id, cantidad: b.cantidad, desde: b.desde, hasta: b.hasta, bloqueo: true })),
  ];
}
