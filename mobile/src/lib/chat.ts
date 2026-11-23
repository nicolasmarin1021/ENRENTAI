import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSesion } from "./sesion";
import { mensajeError, supabase } from "./supabase";

// Chat interno entre cliente y compañía (supabase/migrations/0006_chat.sql y 0014_preguntas_chat.sql):
// una conversación por pareja cliente–compañía. El cliente la abre para preguntar sin cotizar (no
// aparta equipos); las solicitudes también dejan avisos automáticos en ella.

export type Lado = "cliente" | "compania";
export type Autor = Lado | "sistema";
export type Mensaje = { id: string; conversacion_id: string; autor: Autor; texto: string; creado: string };

// Una conversación de la bandeja (mis_conversaciones).
export type Conversacion = {
  id: string;
  cliente_nombre: string;
  compania_id: string;
  compania_nombre: string;
  compania_zona: string | null;
  compania_verificada: boolean;
  ultimo_texto: string | null;
  ultimo_autor: Autor | null;
  ultimo_mensaje: string;
  sin_leer: number;
  reservas: number;
};

const FALTA_SQL = "Falta ejecutar el SQL 0014_preguntas_chat.sql en Supabase.";

// Abre (o retoma) la conversación con una compañía para preguntarle algo.
export async function abrirConversacion(companiaId: string): Promise<{ id: string | null; error: string }> {
  const { data, error } = await supabase.rpc("abrir_conversacion", { p_compania: companiaId });
  if (error) return { id: null, error: error.code === "PGRST202" ? FALTA_SQL : mensajeError(error, "No pudimos abrir el chat. Intenta de nuevo.") };
  return { id: data as string, error: "" };
}

// "Hacer una pregunta" a una compañía: el botón se ve siempre (con o sin sesión). Pide entrar si hace
// falta, abre la conversación y la muestra (con un comienzo de mensaje, si viene de un equipo). No crea
// ninguna solicitud.
export function usePreguntar() {
  const { usuario, compania } = useSesion();
  const [abriendo, setAbriendo] = useState(false);
  const [error, setError] = useState("");
  const esMia = (companiaId: string) => compania?.id === companiaId;

  async function preguntar(companiaId: string, nombre: string, texto?: string) {
    if (!usuario) {
      router.push("/entrar");
      return;
    }
    setAbriendo(true);
    setError("");
    const r = await abrirConversacion(companiaId);
    setAbriendo(false);
    if (!r.id) {
      setError(r.error);
      return;
    }
    router.push({ pathname: "/chat/[id]", params: { id: r.id, lado: "cliente", titulo: nombre, ...(texto ? { texto } : {}) } });
  }

  return { preguntar, abriendo, error, esMia };
}

export async function enviarMensaje(id: string, lado: Lado, texto: string): Promise<{ m: Mensaje | null; error: string }> {
  const { data, error } = await supabase.rpc("enviar_mensaje", { p_conversacion: id, p_lado: lado, p_texto: texto });
  if (error) return { m: null, error: mensajeError(error, "No pudimos enviar el mensaje. Revisa tu conexión e intenta de nuevo.") };
  return { m: data as Mensaje, error: "" };
}

export const marcarLeida = (id: string, lado: Lado) => {
  void supabase.rpc("marcar_leida", { p_conversacion: id, p_lado: lado }).then(() => {});
};

// Bandeja: se vuelve a leer cada vez que la pantalla aparece.
export function useConversaciones(lado: Lado, activo = true) {
  const [lista, setLista] = useState<Conversacion[] | null>(null);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    if (!activo) return;
    const { data, error: e } = await supabase.rpc("mis_conversaciones", { p_lado: lado });
    setError(e ? (e.code === "PGRST202" ? FALTA_SQL : "No pudimos cargar tus mensajes. Desliza hacia abajo para intentar de nuevo.") : "");
    setLista(((data ?? []) as Conversacion[]).map((c) => ({ ...c, sin_leer: Number(c.sin_leer) || 0 })));
  }, [lado, activo]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );
  return { lista, error, recargar: cargar };
}

// Cuántos mensajes sin leer hay (para los accesos a la bandeja).
export function useSinLeer(lado: Lado, activo = true) {
  const [n, setN] = useState(0);
  useFocusEffect(
    useCallback(() => {
      if (!activo) return;
      let vivo = true;
      void supabase.rpc("chats_sin_leer", { p_lado: lado }).then(({ data }) => {
        if (vivo) setN(Number(data) || 0);
      });
      return () => {
        vivo = false;
      };
    }, [lado, activo]),
  );
  return n;
}

// Una conversación abierta: sus mensajes, que llegan en tiempo real (y, por si la conexión en vivo
// falla, se revisan cada 20 segundos).
export function useMensajes(id: string, lado: Lado) {
  const [mensajes, setMensajes] = useState<Mensaje[] | null>(null);
  const [error, setError] = useState("");
  const ultimo = useRef<string | null>(null);

  const agregar = useCallback((nuevos: Mensaje[]) => {
    if (!nuevos.length) return;
    setMensajes((ms) => {
      const vistos = new Set((ms ?? []).map((m) => m.id));
      const juntos = [...(ms ?? []), ...nuevos.filter((m) => !vistos.has(m.id))].sort((a, b) => a.creado.localeCompare(b.creado));
      ultimo.current = juntos.at(-1)?.creado ?? ultimo.current;
      return juntos;
    });
  }, []);

  useEffect(() => {
    if (!id) return;
    let vivo = true;
    void supabase
      .from("mensajes")
      .select("id, conversacion_id, autor, texto, creado")
      .eq("conversacion_id", id)
      .order("creado")
      .limit(500)
      .then(({ data, error: e }) => {
        if (!vivo) return;
        if (e) setError("No pudimos cargar la conversación. Revisa tu conexión.");
        const lista = (data ?? []) as Mensaje[];
        ultimo.current = lista.at(-1)?.creado ?? null;
        setMensajes(lista);
        marcarLeida(id, lado);
      });

    // Mensajes nuevos en tiempo real (Supabase solo entrega los que las reglas dejan ver).
    const canal = supabase
      .channel(`chat:${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mensajes", filter: `conversacion_id=eq.${id}` }, (p) => {
        const m = p.new as Mensaje;
        agregar([m]);
        if (m.autor !== lado) marcarLeida(id, lado);
      })
      .subscribe();

    // Respaldo: cada 20 segundos trae lo que haya llegado después del último mensaje.
    const t = setInterval(() => {
      let q = supabase.from("mensajes").select("id, conversacion_id, autor, texto, creado").eq("conversacion_id", id).order("creado");
      if (ultimo.current) q = q.gt("creado", ultimo.current);
      void q.then(({ data }) => {
        if (!vivo || !data?.length) return;
        agregar(data as Mensaje[]);
        if ((data as Mensaje[]).some((m) => m.autor !== lado)) marcarLeida(id, lado);
      });
    }, 20000);

    return () => {
      vivo = false;
      clearInterval(t);
      void supabase.removeChannel(canal);
    };
  }, [id, lado, agregar]);

  return { mensajes, error, agregar };
}
