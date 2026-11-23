import { equiposPara } from "./busqueda";
import type { CompaniaPublica, EquipoPublico } from "./catalogo-publico";
import type { Necesidad } from "./pedido";

// Qué tiene cada compañía para el pedido del cliente: lo que muestra el mapa (la referencia, no la cantidad).
export type Referencia = { e: EquipoPublico; exacto: boolean; necesidad: Necesidad };
type Libres = (e: EquipoPublico) => number;

// El equipo de esa compañía que sirve para una cosa del pedido: el exacto que se pidió (si lo tiene) o uno
// equivalente de la misma categoría, siempre con unidades libres en las fechas. Si se pidió solo un tipo de
// equipo (sin marca ni modelo), cualquiera de ese tipo es exacto.
export function referenciaPara(n: Necesidad, c: CompaniaPublica, libres: Libres): Referencia | null {
  const { exactos, alternativas } = equiposPara(n, c.equipos);
  const exacto = !n.texto || exactos.length > 0;
  const pool = (exactos.length ? exactos : alternativas).filter((e) => libres(e) > 0);
  if (!pool.length) return null;
  // Primero el que alcanza solo para la cantidad pedida, luego el de más unidades, luego el más barato.
  const alcanza = (e: EquipoPublico) => (libres(e) >= n.cantidad ? 1 : 0);
  pool.sort((a, b) => alcanza(b) - alcanza(a) || libres(b) - libres(a) || a.precio_dia - b.precio_dia);
  return { e: pool[0], exacto, necesidad: n };
}

// Texto de la referencia: "Shure ULXD4" o "≈ Sennheiser EW-DX" (equivalente).
export const textoRef = (r: Referencia, max = 22) => {
  const n = r.e.nombre.length > max ? `${r.e.nombre.slice(0, max - 1).trim()}…` : r.e.nombre;
  return r.exacto ? n : `≈ ${n}`;
};

// Nombre corto de un equipo para el marcador del mapa.
export const nombreCorto = (nombre: string, max = 22) => (nombre.length > max ? `${nombre.slice(0, max - 1).trim()}…` : nombre);
