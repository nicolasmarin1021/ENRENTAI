// Carga del chat en el servidor: la bandeja de conversaciones y la conversación abierta.
import type { Conversacion, ConversacionAbierta, Lado, Mensaje, ReservaChat } from "./chat";
import { iniciales } from "./sesion";
import { createClient } from "./supabase/server";

// Fila que devuelve la función mis_conversaciones de la base de datos.
type Fila = {
  id: string;
  cliente: string;
  cliente_nombre: string;
  compania_id: string;
  compania_nombre: string;
  compania_zona: string | null;
  compania_verificada: boolean;
  ultimo_texto: string | null;
  ultimo_autor: Conversacion["ultimoAutor"];
  ultimo_mensaje: string;
  leido: string;
  sin_leer: number;
  reservas: number;
};

export type DatosChat =
  | { ok: false } // falta ejecutar 0006_chat.sql
  | { ok: true; lista: Conversacion[]; abierta: ConversacionAbierta | null; explicita: boolean; ahora: number };

type Busqueda = { c?: string | string[]; reserva?: string | string[] };
const texto = (v: string | string[] | undefined) => (typeof v === "string" ? v : null);

export async function cargarChat(lado: Lado, sp: Busqueda): Promise<DatosChat> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mis_conversaciones", { p_lado: lado });
  if (error) return { ok: false };
  const filas = (data ?? []) as Fila[];

  const lista: Conversacion[] = filas.map((f) => {
    const nombre = lado === "cliente" ? f.compania_nombre : f.cliente_nombre || "Cliente";
    const detalle =
      lado === "cliente"
        ? [f.compania_verificada ? "Compañía verificada" : "", f.compania_zona ? `Bodega en ${f.compania_zona}` : ""]
            .filter(Boolean)
            .join(" · ")
        : `${f.reservas} ${f.reservas === 1 ? "reserva" : "reservas"} contigo`;
    return {
      id: f.id,
      nombre,
      iniciales: iniciales(nombre),
      detalle,
      ultimoTexto: f.ultimo_texto,
      ultimoAutor: f.ultimo_autor,
      ultimoMensaje: f.ultimo_mensaje,
      leido: f.leido,
      sinLeer: f.sin_leer,
    };
  });

  // ¿Qué conversación abrir? La pedida (?c=…), la de una reserva (?reserva=…) o la más reciente.
  let abiertaId = texto(sp.c);
  const reservaId = texto(sp.reserva);
  if (!abiertaId && reservaId) {
    const { data: r } = await supabase.from("reservas").select("cliente, compania_id").eq("id", reservaId).maybeSingle();
    if (r) abiertaId = filas.find((f) => f.cliente === r.cliente && f.compania_id === r.compania_id)?.id ?? null;
  }
  const explicita = Boolean(abiertaId && filas.some((f) => f.id === abiertaId));
  if (!explicita) abiertaId = filas[0]?.id ?? null;

  const ahora = Date.now();
  const fila = filas.find((f) => f.id === abiertaId);
  if (!fila) return { ok: true, lista, abierta: null, explicita: false, ahora };

  const [{ data: msjs }, { data: reservas }] = await Promise.all([
    supabase
      .from("mensajes")
      .select("id, conversacion_id, autor, texto, creado")
      .eq("conversacion_id", fila.id)
      .order("creado", { ascending: false })
      .limit(400),
    supabase
      .from("reservas")
      .select("id, codigo, estado, entrega, recogida")
      .eq("cliente", fila.cliente)
      .eq("compania_id", fila.compania_id)
      .order("entrega", { ascending: false })
      .limit(20),
  ]);

  return {
    ok: true,
    lista,
    abierta: {
      conv: lista.find((c) => c.id === fila.id)!,
      mensajes: ((msjs ?? []) as Mensaje[]).reverse(),
      reservas: (reservas ?? []) as ReservaChat[],
    },
    explicita,
    ahora,
  };
}
