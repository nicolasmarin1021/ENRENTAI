"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

// El pedido que la persona arma en Explorar (qué, cuándo y dónde).
// Se guarda en esta pestaña del navegador para no perderlo al recargar.

export type Necesidad = { id: string; texto: string; categoria: string; cantidad: number };
export type LugarPedido = { id?: string; nombre: string; direccion?: string; lat: number; lng: number };
export type ItemRider = { equipo_id: string; compania_id: string; cantidad: number };
export type OpcionesCompania = { modalidad: "entrega" | "retiro"; tecnico: boolean; nota: string };
export type Pedido = {
  necesidades: Necesidad[];
  entrega: string; // "AAAA-MM-DDTHH:mm" hora local
  recogida: string;
  lugar: LugarPedido | null;
  listo: boolean; // ya terminó el pedido guiado
  rider: ItemRider[]; // equipos elegidos (puede haber de varias compañías)
  opciones: Record<string, OpcionesCompania>; // por compañía
  nota: string; // nota para las compañías (va en cada solicitud)
};

export type GuardarPedido = (p: Pedido | ((actual: Pedido) => Pedido)) => void;

export const PEDIDO_VACIO: Pedido = {
  necesidades: [],
  entrega: "",
  recogida: "",
  lugar: null,
  listo: false,
  rider: [],
  opciones: {},
  nota: "",
};

// Cambia la cantidad de un equipo en el rider (0 = lo quita).
export function conCantidad(p: Pedido, equipo_id: string, compania_id: string, cantidad: number): Pedido {
  const resto = p.rider.filter((i) => i.equipo_id !== equipo_id);
  return { ...p, rider: cantidad > 0 ? [...resto, { equipo_id, compania_id, cantidad }] : resto };
}

// ISO con zona horaria a partir de "AAAA-MM-DDTHH:mm" local.
export const aISO = (local: string) => new Date(local).toISOString();

const CLAVE = "enrenta:pedido:v1";
const oyentes = new Set<() => void>();
let memoria: string | null | undefined; // undefined = aún no se ha leído

function leer() {
  if (memoria === undefined) {
    try {
      memoria = sessionStorage.getItem(CLAVE);
    } catch {
      memoria = null;
    }
  }
  return memoria;
}

function suscribir(aviso: () => void) {
  oyentes.add(aviso);
  return () => oyentes.delete(aviso);
}

function interpretar(crudo: string | null): Pedido {
  if (!crudo) return PEDIDO_VACIO;
  try {
    return { ...PEDIDO_VACIO, ...JSON.parse(crudo) };
  } catch {
    return PEDIDO_VACIO;
  }
}

export function usePedido() {
  const crudo = useSyncExternalStore(suscribir, leer, () => null);
  const pedido = useMemo(() => interpretar(crudo), [crudo]);
  // Acepta el pedido nuevo o una función que lo calcula a partir del más reciente
  // (así dos cambios seguidos no se pisan).
  const guardar = useCallback((p: Pedido | ((actual: Pedido) => Pedido)) => {
    const siguiente = typeof p === "function" ? p(interpretar(leer())) : p;
    memoria = JSON.stringify(siguiente);
    try {
      sessionStorage.setItem(CLAVE, memoria);
    } catch {
      // Navegación privada o almacenamiento bloqueado: queda solo en memoria.
    }
    oyentes.forEach((f) => f());
  }, []);
  return [pedido, guardar] as const;
}

// ---- Fechas ----
const aFecha = (s: string) => (s ? new Date(s) : null);

// Días cobrados: uno por cada 24 h entre entrega y recogida (24 h exactas = 1 día).
export function diasDeRenta(entrega: string, recogida: string) {
  const a = aFecha(entrega);
  const b = aFecha(recogida);
  if (!a || !b || Number.isNaN(+a) || Number.isNaN(+b) || b <= a) return 0;
  return Math.max(1, Math.ceil((+b - +a) / 36e5 / 24 - 1e-9));
}

export function textoFecha(s: string) {
  const d = aFecha(s);
  if (!d || Number.isNaN(+d)) return "";
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d);
}

// "AAAA-MM-DDTHH:mm" en hora local, a partir de hoy + días, a una hora dada.
export function fechaLocal(diasDesdeHoy: number, hora: number) {
  const d = new Date();
  d.setDate(d.getDate() + diasDesdeHoy);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(hora)}:00`;
}
