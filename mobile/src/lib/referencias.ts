import { equiposPara } from "./busqueda";
import type { CompaniaPublica, EquipoPublico } from "./catalogo";
import { cotizar, type Punto } from "./geo";
import type { Necesidad } from "./pedido";

// Qué tiene cada compañía para el pedido del cliente (lo usan el mapa de Explorar y la ficha
// de la compañía).

export type Referencia = { e: EquipoPublico; exacto: boolean; necesidad: Necesidad };
type Libres = (e: EquipoPublico) => number;

// El equipo de esa compañía que sirve para una cosa del pedido: el exacto que se pidió (si lo
// tiene) o uno equivalente de la misma categoría, siempre con unidades libres en las fechas.
// Si se pidió solo un tipo de equipo (sin marca ni modelo), cualquiera de ese tipo es exacto.
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

// Texto de la referencia: "Shure ULXD4 + ULXD2" o "≈ Sennheiser EW-DX" (equivalente).
export const textoRef = (r: Referencia, max = 22) => {
  const n = r.e.nombre.length > max ? `${r.e.nombre.slice(0, max - 1).trim()}…` : r.e.nombre;
  return r.exacto ? n : `≈ ${n}`;
};

// Precio de referencia de lo más barato de esa compañía que cubre cada cosa del pedido.
export function estimar(c: CompaniaPublica, necesidades: Necesidad[], libres: Libres, dias: number, lugar: Punto) {
  const items: { precio_dia: number; cantidad: number }[] = [];
  const fotos: string[] = [];
  let cubiertas = 0;
  for (const n of necesidades) {
    const { exactos, alternativas } = equiposPara(n, c.equipos);
    const pool = (exactos.length ? exactos : alternativas).filter((e) => libres(e) > 0).sort((a, b) => a.precio_dia - b.precio_dia);
    if (pool.length) cubiertas++;
    let falta = n.cantidad;
    for (const e of pool) {
      if (e.fotos[0] && !fotos.includes(e.fotos[0])) fotos.push(e.fotos[0]);
      if (falta <= 0) continue;
      const k = Math.min(falta, libres(e));
      items.push({ precio_dia: e.precio_dia, cantidad: k });
      falta -= k;
    }
  }
  const puede = cotizar(c, [], dias, lugar, "entrega", false).puedeEntregar;
  return { cubiertas, fotos, cobro: cotizar(c, items, dias, lugar, puede ? "entrega" : "retiro", false) };
}
