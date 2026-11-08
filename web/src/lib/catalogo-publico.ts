import type { EstadoEquipo } from "./catalogo";
import type { Transporte } from "./geo";
import { supabaseConfigured } from "./supabase/config";
import { crearClientePublico } from "./supabase/publico";

export type EquipoPublico = {
  id: string;
  compania_id: string;
  nombre: string;
  categoria_id: string;
  incluye: string | null;
  unidades: number;
  precio_dia: number;
  dimensiones: string | null;
  peso_kg: number | null;
  estado: EstadoEquipo;
  banda_nombre: string | null;
  banda_min_mhz: number | null;
  banda_max_mhz: number | null;
  fotos: string[]; // rutas en Storage, la primera es la portada
};

export type CompaniaPublica = Transporte & {
  id: string;
  nombre: string;
  zona: string | null;
  ciudad: string;
  lat: number;
  lng: number;
  verificada: boolean;
  deposito_pct: number;
  direccion_bodega: string | null;
  horario_bodega: string | null;
  tecnico_nombre: string | null;
  tecnico_tarifa_dia: number | null;
  equipos: EquipoPublico[];
};

export type LugarPublico = { id: string; nombre: string; direccion: string | null; lat: number; lng: number };

export type Catalogo = { companias: CompaniaPublica[]; lugares: LugarPublico[] };

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

type FilaEquipo = Omit<EquipoPublico, "fotos" | "compania_id"> & { equipo_fotos: { ruta: string; orden: number }[] };
type FilaCompania = Omit<CompaniaPublica, "equipos"> & { equipos: FilaEquipo[] };

// Compañías con equipos publicados y lugares públicos. Solo datos públicos: las
// reglas de la base de datos ya ocultan los equipos en pausa y los datos privados.
export async function getCatalogo(): Promise<Catalogo> {
  if (!supabaseConfigured) return { companias: [], lugares: [] };
  const sb = crearClientePublico();
  const [{ data: cs }, { data: ls }] = await Promise.all([
    sb
      .from("companias")
      .select(
        "id, nombre, zona, ciudad, lat, lng, verificada, deposito_pct, direccion_bodega, horario_bodega, cobertura_km, transporte_modo, transporte_fijo, transporte_base, transporte_km, tecnico_nombre, tecnico_tarifa_dia, " +
          "equipos(id, nombre, categoria_id, incluye, unidades, precio_dia, dimensiones, peso_kg, estado, banda_nombre, banda_min_mhz, banda_max_mhz, equipo_fotos(ruta, orden))",
      )
      .not("lat", "is", null)
      .not("lng", "is", null),
    sb.from("lugares").select("id, nombre, direccion, lat, lng").eq("publico", true).order("nombre"),
  ]);

  const companias = ((cs ?? []) as unknown as FilaCompania[])
    .map(
      (c): CompaniaPublica => ({
        ...c,
        lat: Number(c.lat),
        lng: Number(c.lng),
        deposito_pct: Number(c.deposito_pct),
        tecnico_tarifa_dia: num(c.tecnico_tarifa_dia),
        equipos: (c.equipos ?? []).map(({ equipo_fotos, ...e }) => ({
          ...e,
          compania_id: c.id,
          precio_dia: Number(e.precio_dia),
          peso_kg: num(e.peso_kg),
          banda_min_mhz: num(e.banda_min_mhz),
          banda_max_mhz: num(e.banda_max_mhz),
          fotos: [...(equipo_fotos ?? [])].sort((a, b) => a.orden - b.orden).map((f) => f.ruta),
        })),
      }),
    )
    .filter((c) => c.equipos.length > 0);

  const lugares = ((ls ?? []) as LugarPublico[])
    .filter((l) => l.lat !== null && l.lng !== null)
    .map((l) => ({ ...l, lat: Number(l.lat), lng: Number(l.lng) }));

  return { companias, lugares };
}
