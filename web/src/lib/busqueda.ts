// Búsqueda de equipos por texto: adivina el tipo de equipo y encuentra coincidencias.
// Es la misma lógica del prototipo, ahora sobre el inventario real.

export type EquipoBuscable = { id: string; nombre: string; incluye: string | null; categoria_id: string };

export const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const palabras = (s: string) => " " + norm(s).replace(/[^a-z0-9]+/g, " ").trim() + " ";
const VACIAS = new Set([
  "de", "la", "el", "los", "las", "con", "para", "un", "una", "y", "x", "por",
  "equipo", "equipos", "unidad", "unidades", "renta", "rentar", "alquiler",
]);
const fichas = (s: string) => norm(s).split(/[^a-z0-9]+/).filter((t) => t.length >= 2 && !VACIAS.has(t));

// Palabras clave por categoría (marcas, modelos y nombres comunes en Colombia).
const CLAVES: Record<string, string[]> = {
  mic: ["mic", "micro", "microfono", "microfonos", "de mano", "handheld", "lavalier", "solapa", "diadema", "vincha", "ulx", "ulxd", "qlx", "qlxd", "slx", "slxd", "axient", "ad2", "ad4", "ewdx", "ew dx", "skm", "digital 6000", "sm58", "beta 58", "beta58", "ksm", "mmd"],
  iem: ["in ear", "inear", "iem", "psm", "p10", "p9", "ew iem", "monitoreo personal", "monitoreo inalambrico", "audifonos in ear"],
  antena: ["antena", "antenas", "ua845", "ua874", "combinador", "pa821", "helicoidal", "ha 8089", "ha8089", "distribuidor", "paddle"],
  coord: ["analizador", "espectro", "coordinacion", "coordinador rf", "rf explorer", "workbench", "escaner", "scanner"],
  consola: ["consola", "consolas", "mezcladora", "mezclador", "mixer", "digico", "sd12", "sd10", "quantum", "dlive", "m32", "x32", "cl5", "ql5", "yamaha cl", "allen", "midas", "soundcraft", "avid"],
  pa: ["line array", "linearray", "array", "sistema pa", "pa", "k2", "k1", "ks28", "kara", "v8", "v sub", "vsub", "vtx", "a12", "b28", "hdl", "sub", "subwoofer", "caja", "cajas", "parlante", "parlantes", "altavoz", "bafle", "bafles", "sonido principal"],
  monitor: ["monitor", "monitores", "monitor de piso", "cuna", "cunas", "wedge", "retorno", "retornos", "m4", "x15", "nx 15", "nx15"],
  intercom: ["intercom", "intercomunicador", "freespeak", "clear com", "clearcom", "solidcom", "hollyland", "beltpack", "headset"],
};
const CLAVES_N = Object.fromEntries(Object.entries(CLAVES).map(([c, l]) => [c, l.map((k) => palabras(k).trim())]));

const pajar = (e: EquipoBuscable) => {
  const h = norm(`${e.nombre} ${e.incluye ?? ""}`);
  return h + " " + h.replace(/[^a-z0-9]+/g, "");
};

export function coincide(texto: string, e: EquipoBuscable) {
  const t = fichas(texto);
  if (!t.length) return false;
  const h = pajar(e);
  return t.every((x) => h.includes(x));
}

// Devuelve la categoría más probable, o null si no está claro (mejor preguntar).
export function adivinarCategoria(texto: string, equipos: EquipoBuscable[]): string | null {
  const w = palabras(texto);
  if (!w.trim()) return null;
  const puntos: Record<string, number> = {};
  for (const [c, lista] of Object.entries(CLAVES_N))
    for (const k of lista) if (k && w.includes(" " + k)) puntos[c] = Math.max(puntos[c] ?? 0, k.length);
  for (const e of equipos) if (coincide(texto, e)) puntos[e.categoria_id] = (puntos[e.categoria_id] ?? 0) + 3;
  const orden = Object.entries(puntos).sort((a, b) => b[1] - a[1]);
  if (!orden.length) return null;
  if (orden[1] && orden[1][1] === orden[0][1]) return null; // empate (p. ej. solo la marca)
  return orden[0][0];
}

// Equipos que cubren una necesidad: los que coinciden con el texto y, aparte, otros de la misma categoría.
export function equiposPara<T extends EquipoBuscable>(n: { texto: string; categoria: string }, equipos: T[]) {
  const enCategoria = equipos.filter((e) => e.categoria_id === n.categoria);
  const exactos = n.texto ? enCategoria.filter((e) => coincide(n.texto, e)) : [];
  return { exactos, alternativas: enCategoria.filter((e) => !exactos.includes(e)) };
}
