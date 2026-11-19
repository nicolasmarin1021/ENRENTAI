// BETA: el cliente y la compañía se hablan por WhatsApp. Aquí se arma el número y el
// mensaje ya escrito con el rider (enlaces "click to chat" de WhatsApp: wa.me).
import { fechaCO, pesos } from "./medellin";

// "300 123 4567" → "573001234567" (Colombia); otros países se escriben con su indicativo.
export function normalizarWhatsApp(v: string) {
  const d = v.replace(/\D/g, "");
  return d.length === 10 && d.startsWith("3") ? `57${d}` : d;
}

export const whatsappValido = (numero: string) => /^[0-9]{10,15}$/.test(numero);

// "573001234567" → "+57 300 123 4567"
export function mostrarWhatsApp(numero: string) {
  const m = numero.match(/^57(\d{3})(\d{3})(\d{4})$/);
  return m ? `+57 ${m[1]} ${m[2]} ${m[3]}` : `+${numero}`;
}

export const enlaceWhatsApp = (numero: string, texto: string) => `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;

export type DatosMensaje = {
  compania: string;
  codigo: string;
  entrega: string; // ISO
  recogida: string; // ISO
  lugar: string;
  modalidad: "entrega" | "retiro";
  tecnico: string | null; // nombre del técnico, si lo pide
  items: { nombre: string; cantidad: number }[];
  referencia: number; // alquiler + transporte + técnico
  nota: string;
};

// El mensaje que le llega a la compañía.
export function mensajeSolicitud(d: DatosMensaje) {
  const logistica =
    d.modalidad === "entrega" ? `con entrega y recogida en ${d.lugar}` : `para el show en ${d.lugar}; lo recojo y lo devuelvo en su bodega`;
  return [
    `Hola ${d.compania}, vi su equipo en ENRENTA (solicitud ${d.codigo}).`,
    `Lo necesito desde el ${fechaCO(d.entrega)} hasta el ${fechaCO(d.recogida)}, ${logistica}${d.tecnico ? `, con ${d.tecnico}` : ""}:`,
    ...d.items.map((i) => `• ${i.cantidad}× ${i.nombre}`),
    `Precio de referencia en ENRENTA: ${pesos(d.referencia)}.`,
    ...(d.nota.trim() ? [`Nota: ${d.nota.trim()}`] : []),
    "¿Está disponible?",
  ].join("\n");
}

// Abre una pestaña en el mismo clic (los navegadores bloquean las que se abren después
// de esperar una respuesta) y devuelve cómo llevarla a WhatsApp o cerrarla si algo falla.
export function prepararPestana() {
  const w = window.open("", "_blank");
  if (w) w.opener = null;
  return {
    ir: (url: string) => (w ? (w.location.href = url) : window.location.assign(url)),
    cerrar: () => w?.close(),
  };
}
