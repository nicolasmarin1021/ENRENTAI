import { createContext, use, useCallback, useEffect, useState, type ReactNode } from "react";
import type { Transporte } from "./geo";
import { supabase, supabaseConfigurado, supabaseUrl } from "./supabase";

// Catálogo público: compañías con equipos publicados, lugares de show y categorías.
// Es lo mismo que lee la web en web/src/lib/catalogo-publico.ts.

export type Categoria = { id: string; nombre: string };

export type EstadoEquipo = "nuevo" | "excelente" | "bueno" | "con_detalles";
export const ESTADOS_EQUIPO: { id: EstadoEquipo; nombre: string }[] = [
  { id: "nuevo", nombre: "Nuevo" },
  { id: "excelente", nombre: "Excelente" },
  { id: "bueno", nombre: "Bueno" },
  { id: "con_detalles", nombre: "Bueno, con marcas de uso" },
];
export const nombreEstado = (id: string) => ESTADOS_EQUIPO.find((e) => e.id === id)?.nombre ?? id;

// Nombres cortos de los tipos de equipo (para chips y cuadrículas).
export const NOMBRE_CORTO: Record<string, string> = {
  mic: "Micrófonos",
  iem: "In-ear",
  antena: "Antenas",
  coord: "Coord. RF",
  consola: "Consolas",
  pa: "Sistemas PA",
  monitor: "Monitores",
  intercom: "Intercom",
};

// Categorías de equipos inalámbricos: solo a estas se les pide la banda RF.
export const CATEGORIAS_RF = new Set(["mic", "iem", "antena", "coord", "intercom"]);
export const MAX_FOTOS = 6;

// URL pública de una foto del bucket "equipos".
export const urlFoto = (ruta: string) =>
  `${supabaseUrl}/storage/v1/object/public/equipos/${ruta.split("/").map(encodeURIComponent).join("/")}`;

export type ResumenResenas = { promedio: number; total: number };

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
  fotos: string[]; // rutas en Storage; la primera es la portada
};

export type CompaniaPublica = Transporte & {
  id: string;
  nombre: string;
  zona: string | null;
  ciudad: string;
  lat: number;
  lng: number;
  verificada: boolean;
  direccion_bodega: string | null;
  horario_bodega: string | null;
  tecnico_nombre: string | null;
  tecnico_tarifa_dia: number | null;
  equipos: EquipoPublico[];
  resenas: ResumenResenas | null;
};

export type LugarPublico = { id: string; nombre: string; direccion: string | null; lat: number; lng: number };

export type Catalogo = { companias: CompaniaPublica[]; lugares: LugarPublico[]; categorias: Categoria[] };

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

type FilaEquipo = Omit<EquipoPublico, "fotos" | "compania_id"> & { equipo_fotos: { ruta: string; orden: number }[] };
type FilaCompania = Omit<CompaniaPublica, "equipos" | "resenas"> & { equipos: FilaEquipo[] };

async function leerCatalogo(): Promise<Catalogo> {
  if (!supabaseConfigurado) return { companias: [], lugares: [], categorias: [] };
  const [cs, ls, rs, cats] = await Promise.all([
    supabase
      .from("companias")
      .select(
        "id, nombre, zona, ciudad, lat, lng, verificada, direccion_bodega, horario_bodega, cobertura_km, transporte_modo, transporte_fijo, transporte_base, transporte_km, tecnico_nombre, tecnico_tarifa_dia, " +
          "equipos(id, nombre, categoria_id, incluye, unidades, precio_dia, dimensiones, peso_kg, estado, banda_nombre, banda_min_mhz, banda_max_mhz, equipo_fotos(ruta, orden))",
      )
      .not("lat", "is", null)
      .not("lng", "is", null),
    supabase.from("lugares").select("id, nombre, direccion, lat, lng").eq("publico", true).order("nombre"),
    supabase.from("resumen_resenas").select("compania_id, promedio, total"),
    supabase.from("categorias").select("id, nombre").order("orden"),
  ]);
  if (cs.error) throw cs.error;

  const resumen = new Map(
    ((rs.data ?? []) as { compania_id: string; promedio: number; total: number }[]).map((r) => [
      r.compania_id,
      { promedio: Number(r.promedio), total: Number(r.total) },
    ]),
  );

  const companias = ((cs.data ?? []) as unknown as FilaCompania[])
    .map(
      (c): CompaniaPublica => ({
        ...c,
        lat: Number(c.lat),
        lng: Number(c.lng),
        cobertura_km: Number(c.cobertura_km),
        transporte_fijo: Number(c.transporte_fijo),
        transporte_base: Number(c.transporte_base),
        transporte_km: Number(c.transporte_km),
        tecnico_tarifa_dia: num(c.tecnico_tarifa_dia),
        resenas: resumen.get(c.id) ?? null,
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

  const lugares = ((ls.data ?? []) as LugarPublico[])
    .filter((l) => l.lat !== null && l.lng !== null)
    .map((l) => ({ ...l, lat: Number(l.lat), lng: Number(l.lng) }));

  return { companias, lugares, categorias: (cats.data ?? []) as Categoria[] };
}

type EstadoCatalogo = {
  catalogo: Catalogo;
  cargando: boolean;
  error: string;
  recargar: () => Promise<void>;
};

const VACIO: Catalogo = { companias: [], lugares: [], categorias: [] };
const Contexto = createContext<EstadoCatalogo>({ catalogo: VACIO, cargando: true, error: "", recargar: async () => {} });

export function CatalogoProvider({ children }: { children: ReactNode }) {
  const [catalogo, setCatalogo] = useState<Catalogo>(VACIO);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const recargar = useCallback(async () => {
    setCargando(true);
    try {
      setCatalogo(await leerCatalogo());
      setError("");
    } catch {
      setError("No pudimos cargar los equipos. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }, []);

  // Primera carga al abrir la app.
  useEffect(() => {
    let vivo = true;
    leerCatalogo()
      .then((c) => {
        if (vivo) setCatalogo(c);
      })
      .catch(() => {
        if (vivo) setError("No pudimos cargar los equipos. Revisa tu conexión e intenta de nuevo.");
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });
    return () => {
      vivo = false;
    };
  }, []);

  return <Contexto value={{ catalogo, cargando, error, recargar }}>{children}</Contexto>;
}

export const useCatalogo = () => use(Contexto);

// Busca un equipo o una compañía del catálogo por id.
export function useEquipo(id: string | undefined) {
  const { catalogo } = useCatalogo();
  for (const c of catalogo.companias) {
    const e = c.equipos.find((x) => x.id === id);
    if (e) return { equipo: e, compania: c };
  }
  return null;
}
