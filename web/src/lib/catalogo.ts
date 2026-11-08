// Datos del catálogo que se usan tanto en el servidor como en el navegador.
import { supabaseUrl } from "./supabase/config";

export type Categoria = { id: string; nombre: string };

export type EstadoEquipo = "nuevo" | "excelente" | "bueno" | "con_detalles";
export const ESTADOS: { id: EstadoEquipo; nombre: string }[] = [
  { id: "nuevo", nombre: "Nuevo" },
  { id: "excelente", nombre: "Excelente" },
  { id: "bueno", nombre: "Bueno" },
  { id: "con_detalles", nombre: "Bueno, con marcas de uso" },
];
export const nombreEstado = (id: string) => ESTADOS.find((e) => e.id === id)?.nombre ?? id;

// Categorías de equipos inalámbricos: solo a estas se les pide la banda RF.
export const CATEGORIAS_RF = new Set(["mic", "iem", "antena", "coord", "intercom"]);

export const MAX_FOTOS = 6;

// URL pública de una foto del bucket "equipos" (no hace ninguna petición).
export const urlFoto = (ruta: string) =>
  `${supabaseUrl}/storage/v1/object/public/equipos/${ruta.split("/").map(encodeURIComponent).join("/")}`;
