// Chat entre clientes y compañías: tipos y ayudas que sirven en el servidor y en el navegador.
// Hay una conversación por cada pareja cliente–compañía (ver supabase/migrations/0006_chat.sql).

export type Lado = "cliente" | "compania";
export type Autor = Lado | "sistema";

// Una conversación de la bandeja, ya vista desde un lado (nombre = con quién hablo).
export type Conversacion = {
  id: string;
  nombre: string;
  iniciales: string;
  detalle: string; // segunda línea del encabezado
  ultimoTexto: string | null;
  ultimoAutor: Autor | null;
  ultimoMensaje: string; // ISO
  leido: string; // ISO: hasta cuándo leí
  sinLeer: number;
};

export type Mensaje = {
  id: string;
  conversacion_id: string;
  autor: Autor;
  texto: string;
  creado: string; // ISO
};

export type ReservaChat = { id: string; codigo: string; estado: string; entrega: string; recogida: string };

export type ConversacionAbierta = { conv: Conversacion; mensajes: Mensaje[]; reservas: ReservaChat[] };

export const otroLado = (l: Lado): Lado => (l === "cliente" ? "compania" : "cliente");

// Mensajes rápidos: el texto se agrega al campo para completarlo antes de enviar.
export const RAPIDOS: Record<Lado, [etiqueta: string, texto: string][]> = {
  cliente: [
    ["Cambiar la hora de entrega", "Quisiera cambiar la hora de entrega a las "],
    ["Agregar o quitar equipos", "Quisiera agregar "],
    ["Un equipo presenta fallas", "Tenemos un problema con "],
    ["Plan de frecuencias", "¿Nos comparten el plan de frecuencias?"],
  ],
  compania: [
    ["Confirmar entrega", "Confirmamos la entrega a la hora acordada."],
    ["Equipo despachado", "El equipo ya salió de nuestra bodega hacia el lugar del evento."],
    ["Plan de frecuencias", "Te compartimos el plan de frecuencias para tu revisión."],
    ["Recordar la recogida", "Te recordamos que la recogida es a la hora acordada."],
  ],
};

// ---- Fechas en hora de Colombia ----
const ZONA = "America/Bogota";

// Milisegundos de una fecha de Supabase (acepta "2026-11-10T20:12:33+00:00" y "2026-11-10 20:12:33+00").
export function ms(fecha: string) {
  const iso = fecha.includes("T") ? fecha : fecha.replace(" ", "T");
  return Date.parse(/[+-]\d\d$/.test(iso) ? iso + ":00" : iso);
}

const diaDe = (t: number) => new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(t); // AAAA-MM-DD
export const diaCO = (fecha: string) => diaDe(ms(fecha));

export const horaCO = (fecha: string) =>
  new Intl.DateTimeFormat("es-CO", { timeZone: ZONA, hour: "numeric", minute: "2-digit" }).format(ms(fecha));

// En la bandeja: la hora si fue hoy, "ayer" o la fecha corta.
export function cuandoCorto(fecha: string, ahora: number) {
  const d = diaCO(fecha);
  if (d === diaDe(ahora)) return horaCO(fecha);
  if (d === diaDe(ahora - 864e5)) return "ayer";
  return new Intl.DateTimeFormat("es-CO", { timeZone: ZONA, day: "numeric", month: "short" }).format(ms(fecha));
}

// Separador de días dentro de la conversación: "Hoy", "Ayer" o "Lunes, 10 de noviembre".
export function etiquetaDia(fecha: string, ahora: number) {
  const d = diaCO(fecha);
  if (d === diaDe(ahora)) return "Hoy";
  if (d === diaDe(ahora - 864e5)) return "Ayer";
  const t = new Intl.DateTimeFormat("es-CO", { timeZone: ZONA, weekday: "long", day: "numeric", month: "long" }).format(ms(fecha));
  return t.charAt(0).toUpperCase() + t.slice(1);
}
