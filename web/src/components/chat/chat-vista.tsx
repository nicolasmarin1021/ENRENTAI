"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import {
  RAPIDOS,
  cuandoCorto,
  diaCO,
  etiquetaDia,
  horaCO,
  ms,
  otroLado,
  type Conversacion,
  type ConversacionAbierta,
  type Lado,
  type Mensaje,
} from "@/lib/chat";
import { ESTADOS_RESERVA } from "@/lib/cobro";
import { rangoCO } from "@/lib/medellin";
import { useEsAngosto } from "@/lib/pantalla";
import { createClient } from "@/lib/supabase/client";

type Props = {
  lado: Lado;
  lista: Conversacion[];
  abierta: ConversacionAbierta | null;
  explicita: boolean; // se pidió esa conversación (en el celular se muestra en vez de la lista)
  ahora: number;
};

// Bandeja de chats: la lista de conversaciones y la conversación abierta.
// Los mensajes nuevos llegan en tiempo real; la bandeja y los contadores se recargan solos.
export function ChatVista({ lado, lista, abierta, explicita, ahora }: Props) {
  const router = useRouter();
  const ruta = usePathname();
  const angosto = useEsAngosto();
  const [nuevos, setNuevos] = useState<Mensaje[]>([]);
  const recarga = useRef<ReturnType<typeof setTimeout> | null>(null);

  const abiertaId = abierta?.conv.id ?? null;
  const visible = Boolean(abierta) && (explicita || !angosto);

  // Mensajes de la conversación abierta: los del servidor más los que llegaron después.
  const mensajes = useMemo(() => {
    if (!abierta) return [];
    const porId = new Map<string, Mensaje>();
    for (const m of abierta.mensajes) porId.set(m.id, m);
    for (const m of nuevos) if (m.conversacion_id === abierta.conv.id) porId.set(m.id, m);
    return [...porId.values()].sort((a, b) => ms(a.creado) - ms(b.creado));
  }, [abierta, nuevos]);

  // Escucha los mensajes nuevos de todas mis conversaciones (Supabase solo entrega los que puedo ver).
  useEffect(() => {
    const supabase = createClient();
    let respaldo: ReturnType<typeof setInterval> | null = null;
    const programarRecarga = () => {
      if (recarga.current) clearTimeout(recarga.current);
      recarga.current = setTimeout(() => router.refresh(), 600);
    };
    const canal = supabase
      .channel(`chat-${lado}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mensajes" }, (aviso) => {
        const m = aviso.new as Mensaje;
        setNuevos((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        programarRecarga();
      })
      .subscribe((estado) => {
        // Sin tiempo real (p. ej. una red que lo bloquea), se revisa cada 20 segundos.
        if ((estado === "CHANNEL_ERROR" || estado === "TIMED_OUT") && !respaldo) {
          respaldo = setInterval(() => router.refresh(), 20000);
        }
      });
    return () => {
      if (respaldo) clearInterval(respaldo);
      if (recarga.current) clearTimeout(recarga.current);
      supabase.removeChannel(canal);
    };
  }, [lado, router]);

  // Marca como leída la conversación que tengo en pantalla cuando llega algo del otro lado.
  const ultimoSinLeer = useMemo(() => {
    if (!abierta) return null;
    const leido = ms(abierta.conv.leido);
    const ajenos = mensajes.filter((m) => m.autor === otroLado(lado) && ms(m.creado) > leido);
    return ajenos.length ? ajenos[ajenos.length - 1].id : null;
  }, [abierta, mensajes, lado]);

  useEffect(() => {
    if (!ultimoSinLeer || !visible || !abiertaId) return;
    let vigente = true;
    createClient()
      .rpc("marcar_leida", { p_conversacion: abiertaId, p_lado: lado })
      .then(() => {
        if (vigente) router.refresh();
      });
    return () => {
      vigente = false;
    };
  }, [ultimoSinLeer, visible, abiertaId, lado, router]);

  const agregarPropio = (m: Mensaje) => {
    setNuevos((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
    if (recarga.current) clearTimeout(recarga.current);
    recarga.current = setTimeout(() => router.refresh(), 600);
  };

  return (
    <div className={`card chat${abierta && explicita ? " has-open" : ""}`}>
      <nav className="chat-list" aria-label="Conversaciones">
        <ul>
          {lista.length ? (
            lista.map((c) => {
              const on = c.id === abiertaId && visible;
              const previa = c.ultimoTexto
                ? (c.ultimoAutor === lado ? "Tú: " : "") + c.ultimoTexto
                : "Sin mensajes todavía";
              const sinLeer = on ? 0 : c.sinLeer;
              return (
                <li key={c.id}>
                  <Link
                    href={`${ruta}?c=${c.id}`}
                    scroll={false}
                    className={`thread${on ? " on" : ""}`}
                    aria-current={on ? "true" : undefined}
                  >
                    <span className="avatar">{c.iniciales}</span>
                    <span className="t-txt">
                      <b>{c.nombre}</b>
                      <span className="one-line">{previa}</span>
                    </span>
                    <span className="t-meta">
                      <time dateTime={c.ultimoMensaje}>{cuandoCorto(c.ultimoMensaje, ahora)}</time>
                      {sinLeer > 0 && (
                        <span className="count hot" aria-label={`${sinLeer} sin leer`}>
                          {sinLeer}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })
          ) : (
            <li className="chat-vacio">
              {lado === "cliente"
                ? "Cuando le envíes una solicitud a una compañía, aquí podrás escribirle."
                : "Cuando un cliente te envíe una solicitud, aquí podrás escribirle."}
            </li>
          )}
        </ul>
      </nav>

      {abierta ? (
        <Conversacion
          key={abierta.conv.id}
          lado={lado}
          abierta={abierta}
          mensajes={mensajes}
          ahora={ahora}
          volver={ruta}
          alEnviar={agregarPropio}
        />
      ) : (
        <div className="chat-main chat-empty">
          <p>{lista.length ? "Elige una conversación." : "Todavía no tienes conversaciones."}</p>
        </div>
      )}
    </div>
  );
}

function Conversacion({
  lado,
  abierta,
  mensajes,
  ahora,
  volver,
  alEnviar,
}: {
  lado: Lado;
  abierta: ConversacionAbierta;
  mensajes: Mensaje[];
  ahora: number;
  volver: string;
  alEnviar: (m: Mensaje) => void;
}) {
  const { conv, reservas } = abierta;
  // Arriba van las reservas en curso, confirmadas o por confirmar; se muestran dos y el resto en "+N más".
  const activa = (estado: string) => ["en_curso", "confirmada", "pendiente"].includes(estado);
  const destacadas = [...reservas].sort((a, b) => Number(activa(b.estado)) - Number(activa(a.estado))).slice(0, 2);
  const resto = reservas.length - destacadas.length;
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const listaRef = useRef<HTMLOListElement>(null);
  const campoRef = useRef<HTMLTextAreaElement>(null);

  // Siempre mostrar el mensaje más reciente.
  useEffect(() => {
    const el = listaRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [mensajes.length]);

  async function enviar(e?: FormEvent) {
    e?.preventDefault();
    const t = texto.trim();
    if (!t || enviando) return;
    setEnviando(true);
    setError("");
    const { data, error: err } = await createClient().rpc("enviar_mensaje", {
      p_conversacion: conv.id,
      p_lado: lado,
      p_texto: t,
    });
    setEnviando(false);
    if (err) {
      // P0001: mensajes propios del chat (p. ej. "El mensaje es muy largo"); el resto, un aviso general.
      setError(
        err.code === "P0001" ? err.message : "No pudimos enviar el mensaje. Revisa tu conexión e intenta de nuevo.",
      );
      return;
    }
    setTexto("");
    alEnviar(data as Mensaje);
    campoRef.current?.focus();
  }

  // Enter envía; Shift + Enter hace un salto de línea.
  function teclas(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void enviar();
    }
  }

  const filas: ReactNode[] = [];
  let dia = "";
  for (const m of mensajes) {
    const d = diaCO(m.creado);
    if (d !== dia) {
      filas.push(
        <li key={`dia-${d}`} className="day-sep">
          {etiquetaDia(m.creado, ahora)}
        </li>,
      );
      dia = d;
    }
    if (m.autor === "sistema") {
      filas.push(
        <li key={m.id} className="msg sys">
          <span>{m.texto}</span>
          <time dateTime={m.creado}>{horaCO(m.creado)}</time>
        </li>,
      );
      continue;
    }
    const mio = m.autor === lado;
    filas.push(
      <li key={m.id} className={`msg ${mio ? "me" : "them"}`}>
        <div className="bubble">{m.texto}</div>
        <span className="msg-meta">
          {mio ? "Tú" : conv.nombre} · <time dateTime={m.creado}>{horaCO(m.creado)}</time>
        </span>
      </li>,
    );
  }

  return (
    <section className="chat-main" aria-label={`Conversación con ${conv.nombre}`}>
      <header className="chat-hd">
        <Link href={volver} scroll={false} className="btn icono chat-back" aria-label="Volver a la lista de conversaciones">
          ‹
        </Link>
        <span className="avatar">{conv.iniciales}</span>
        <div className="t-txt">
          <b>{conv.nombre}</b>
          {conv.detalle && <span className="fine">{conv.detalle}</span>}
        </div>
      </header>

      {reservas.length > 0 && (
        <div className="chat-ctx" aria-label={lado === "cliente" ? "Tus reservas con esta compañía" : "Reservas de este cliente"}>
          {destacadas.map((r) => {
            const est = ESTADOS_RESERVA[r.estado] ?? { texto: r.estado, tono: "" };
            return (
              <Link
                key={r.id}
                className="bk-chip"
                href={lado === "cliente" ? `/reservas/${r.id}` : `/reservas/${r.id}?de=tengo`}
              >
                <span className="code">{r.codigo}</span>
                <span className={`tag sm ${est.tono}`}>{est.texto}</span>
                <span>{rangoCO(r.entrega, r.recogida)}</span>
              </Link>
            );
          })}
          {resto > 0 && (
            <Link className="bk-chip mas" href={lado === "cliente" ? "/necesito/reservas" : "/tengo/panel"}>
              +{resto} más
            </Link>
          )}
        </div>
      )}

      <ol className="msgs" ref={listaRef} role="log" aria-live="polite" aria-label="Mensajes">
        {filas.length ? filas : <li className="msg sys"><span>Escribe tu primer mensaje.</span></li>}
      </ol>

      <div className="chat-rapidos" role="group" aria-label="Mensajes rápidos">
        {RAPIDOS[lado].map(([etiqueta, plantilla]) => (
          <button
            key={etiqueta}
            type="button"
            className="chip"
            onClick={() => {
              setTexto((t) => (t.trim() ? t.trimEnd() + " " : "") + plantilla);
              campoRef.current?.focus();
            }}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      {error && (
        <p className="form-err chat-error" role="alert">
          {error}
        </p>
      )}
      <form className="chat-form" onSubmit={enviar}>
        <label htmlFor="chat-campo" className="sr-only">
          Mensaje para {conv.nombre}
        </label>
        <textarea
          id="chat-campo"
          ref={campoRef}
          rows={2}
          maxLength={2000}
          placeholder={`Escribe a ${conv.nombre}…`}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={teclas}
        />
        <button type="submit" className="btn primary" disabled={enviando || !texto.trim()}>
          {enviando ? "Enviando…" : "Enviar"}
        </button>
      </form>
    </section>
  );
}
