// Carga en el servidor las entregas (pasos con fotos y casos) de una o varias reservas.
import type { Flujo, Lado, Paso } from "./entregas";
import { createClient } from "./supabase/server";

const SELECT_FLUJO =
  "id, codigo, estado, entrega, recogida, modalidad, lugar_nombre, deposito, cliente_nombre, " +
  "companias(nombre, zona, direccion_bodega), reserva_items(nombre, cantidad), " +
  "actas(paso, autor_nombre, creado, checks, nota, acta_fotos(ruta, orden)), " +
  "casos(id, codigo, tipo, descripcion, estado, creado, resuelto, resuelto_por_nombre, abierto_por_nombre, " +
  "caso_fotos(ruta), caso_mensajes(autor_nombre, texto, creado))";

type Fila = {
  id: string;
  codigo: string;
  estado: string;
  entrega: string;
  recogida: string;
  modalidad: "entrega" | "retiro";
  lugar_nombre: string;
  deposito: number;
  cliente_nombre: string;
  companias: { nombre: string; zona: string | null; direccion_bodega: string | null } | null;
  reserva_items: { nombre: string; cantidad: number }[];
  actas: {
    paso: Paso;
    autor_nombre: string;
    creado: string;
    checks: string[];
    nota: string | null;
    acta_fotos: { ruta: string; orden: number }[];
  }[];
  casos: {
    id: string;
    codigo: string;
    tipo: string;
    descripcion: string;
    estado: "abierto" | "resuelto";
    creado: string;
    resuelto: string | null;
    resuelto_por_nombre: string | null;
    abierto_por_nombre: string;
    caso_fotos: { ruta: string }[];
    caso_mensajes: { autor_nombre: string; texto: string; creado: string }[];
  }[];
};

type Filtro = { cliente?: string; compania?: string; reserva?: string };
// ahora: la hora de la carga, para decidir qué pasos ya están disponibles (p. ej. la revisión final).
export type Flujos = { ok: true; activos: Flujo[]; cerrados: Flujo[]; ahora: number } | { ok: false; mensaje: string };

const ORDEN: Record<string, number> = { en_curso: 0, confirmada: 1 };

export async function cargarFlujos(lado: Lado, filtro: Filtro): Promise<Flujos> {
  const supabase = await createClient();
  let q = supabase.from("reservas").select(SELECT_FLUJO).in("estado", ["confirmada", "en_curso", "completada"]);
  if (filtro.cliente) q = q.eq("cliente", filtro.cliente);
  if (filtro.compania) q = q.eq("compania_id", filtro.compania);
  if (filtro.reserva) q = q.eq("id", filtro.reserva);
  const { data, error } = await q.order("entrega", { ascending: true });
  if (error) {
    return {
      ok: false,
      mensaje: ["PGRST200", "PGRST205", "42P01"].includes(error.code)
        ? "Las entregas con fotos aún no están activadas: falta ejecutar el SQL 0004_entregas.sql en Supabase."
        : "No pudimos cargar las entregas. Recarga la página.",
    };
  }
  const filas = (data ?? []) as unknown as Fila[];
  const activas = filas
    .filter((r) => r.estado !== "completada")
    .sort((a, b) => ORDEN[a.estado] - ORDEN[b.estado] || a.entrega.localeCompare(b.entrega));
  const cerradas = filas.filter((r) => r.estado === "completada").reverse().slice(0, filtro.reserva ? 1 : 10);

  // Enlaces firmados (1 hora) para ver las fotos privadas, todos en una sola llamada.
  const rutas = [...activas, ...cerradas].flatMap((r) => [
    ...r.actas.flatMap((a) => a.acta_fotos.map((f) => f.ruta)),
    ...r.casos.flatMap((c) => c.caso_fotos.map((f) => f.ruta)),
  ]);
  const firmadas = new Map<string, string>();
  if (rutas.length) {
    const { data: urls } = await supabase.storage.from("entregas").createSignedUrls(rutas, 3600);
    urls?.forEach((u) => u.path && u.signedUrl && firmadas.set(u.path, u.signedUrl));
  }
  const ver = (rutas: string[]) => rutas.map((r) => firmadas.get(r)).filter((u): u is string => Boolean(u));

  const aFlujo = (r: Fila): Flujo => ({
    id: r.id,
    codigo: r.codigo,
    estado: r.estado,
    entrega: r.entrega,
    recogida: r.recogida,
    contraparte: lado === "cliente" ? r.companias?.nombre ?? "Compañía" : r.cliente_nombre || "Cliente",
    lugar:
      r.modalidad === "entrega"
        ? `Entrega en ${r.lugar_nombre}`
        : `Retiro en bodega${r.companias?.direccion_bodega ? `: ${r.companias.direccion_bodega}` : r.companias?.zona ? ` (${r.companias.zona})` : ""}`,
    deposito: r.deposito,
    items: r.reserva_items,
    actas: r.actas.map((a) => ({
      paso: a.paso,
      autor_nombre: a.autor_nombre,
      creado: a.creado,
      checks: a.checks,
      nota: a.nota,
      fotos: ver([...a.acta_fotos].sort((x, y) => x.orden - y.orden).map((f) => f.ruta)),
    })),
    casos: [...r.casos]
      .sort((a, b) => a.creado.localeCompare(b.creado))
      .map((c) => ({
        id: c.id,
        codigo: c.codigo,
        tipo: c.tipo,
        descripcion: c.descripcion,
        estado: c.estado,
        creado: c.creado,
        resuelto: c.resuelto,
        resuelto_por_nombre: c.resuelto_por_nombre,
        abierto_por_nombre: c.abierto_por_nombre,
        fotos: ver(c.caso_fotos.map((f) => f.ruta)),
        mensajes: [...c.caso_mensajes].sort((a, b) => a.creado.localeCompare(b.creado)),
      })),
  });

  return { ok: true, activos: activas.map(aFlujo), cerrados: cerradas.map(aFlujo), ahora: Date.now() };
}
