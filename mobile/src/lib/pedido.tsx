import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, use, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { fechaLocal } from "./formato";
import { useOcupadas } from "./reservas";

// El pedido que la persona arma en Explorar (qué, cuándo y dónde) y su rider.
// Igual que en la web (web/src/lib/pedido.ts), pero guardado en el celular.

export type Necesidad = { id: string; texto: string; categoria: string; cantidad: number };
export type LugarPedido = { id?: string; nombre: string; direccion?: string; lat: number; lng: number };
export type ItemRider = { equipo_id: string; compania_id: string; cantidad: number };
export type OpcionesCompania = { modalidad: "entrega" | "retiro"; tecnico: boolean };
export type Pedido = {
  necesidades: Necesidad[];
  entrega: string; // "AAAA-MM-DDTHH:mm" hora local
  recogida: string;
  lugar: LugarPedido | null;
  listo: boolean; // ya terminó el pedido guiado
  rider: ItemRider[]; // equipos elegidos (puede haber de varias compañías)
  opciones: Record<string, OpcionesCompania>; // por compañía
  nota: string; // nota para las compañías
};

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

// Fechas sugeridas la primera vez: mañana 14:00 → pasado mañana 12:00.
export const fechasSugeridas = () => ({ entrega: fechaLocal(1, 14), recogida: fechaLocal(2, 12) });

// Cambia la cantidad de un equipo en el rider (0 = lo quita).
export function conCantidad(p: Pedido, equipo_id: string, compania_id: string, cantidad: number): Pedido {
  const resto = p.rider.filter((i) => i.equipo_id !== equipo_id);
  return { ...p, rider: cantidad > 0 ? [...resto, { equipo_id, compania_id, cantidad }] : resto };
}

// Identificador corto para las cosas del pedido (solo vive en este celular).
export const nuevoId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export type GuardarPedido = (p: Pedido | ((actual: Pedido) => Pedido)) => void;

type EquipoRider = { id: string; compania_id: string; unidades: number };

type EstadoPedido = {
  pedido: Pedido;
  guardar: GuardarPedido;
  cargado: boolean;
  libres: (e: EquipoRider) => number; // unidades libres en las fechas del pedido
  enRider: (e: { id: string }) => number;
  cambiar: (e: EquipoRider, cantidad: number) => void;
  recargarOcupadas: () => void; // después de pedir una cotización
};

const CLAVE = "enrenta:pedido:v1";
const Contexto = createContext<EstadoPedido>({
  pedido: PEDIDO_VACIO,
  guardar: () => {},
  cargado: false,
  libres: (e) => e.unidades,
  enRider: () => 0,
  cambiar: () => {},
  recargarOcupadas: () => {},
});

export function PedidoProvider({ children }: { children: ReactNode }) {
  const [pedido, setPedido] = useState<Pedido>(PEDIDO_VACIO);
  const [cargado, setCargado] = useState(false);
  const actual = useRef(PEDIDO_VACIO); // el más reciente, para que dos cambios seguidos no se pisen

  useEffect(() => {
    AsyncStorage.getItem(CLAVE)
      .then((crudo) => {
        if (!crudo) return;
        const leido = { ...PEDIDO_VACIO, ...(JSON.parse(crudo) as Partial<Pedido>) };
        actual.current = leido;
        setPedido(leido);
      })
      .catch(() => {})
      .finally(() => setCargado(true));
  }, []);

  const guardar = useCallback<GuardarPedido>((p) => {
    const siguiente = typeof p === "function" ? p(actual.current) : p;
    actual.current = siguiente;
    setPedido(siguiente);
    AsyncStorage.setItem(CLAVE, JSON.stringify(siguiente)).catch(() => {});
  }, []);

  // Unidades ya apartadas por otras solicitudes rentadas en las fechas del pedido.
  const [version, setVersion] = useState(0);
  const ocupadas = useOcupadas(pedido.entrega, pedido.recogida, version);

  const valor: EstadoPedido = {
    pedido,
    guardar,
    cargado,
    libres: (e) => Math.max(0, e.unidades - (ocupadas[e.id] ?? 0)),
    enRider: (e) => pedido.rider.find((i) => i.equipo_id === e.id)?.cantidad ?? 0,
    cambiar: (e, cantidad) => guardar((p) => conCantidad(p, e.id, e.compania_id, cantidad)),
    recargarOcupadas: () => setVersion((v) => v + 1),
  };

  return <Contexto value={valor}>{children}</Contexto>;
}

export const usePedido = () => use(Contexto);
