// Conducto regular de entrega y devolución (igual al de 0004_entregas.sql).

export type Paso = "salida" | "recepcion" | "devolucion" | "revision";
export type Lado = "cliente" | "compania";

export const PASOS: {
  k: Paso;
  quien: Lado;
  titulo: string;
  verbo: string;
  desc: string;
  checks: string[];
}[] = [
  {
    k: "salida",
    quien: "compania",
    titulo: "Salida de bodega",
    verbo: "Registrar salida",
    desc: "La compañía fotografía el equipo completo, probado y empacado antes de entregarlo.",
    checks: [
      "Cantidades completas según la reserva",
      "Cables, accesorios y estuches incluidos",
      "Equipo probado y funcionando",
      "Baterías cargadas o fuentes incluidas",
    ],
  },
  {
    k: "recepcion",
    quien: "cliente",
    titulo: "Recepción",
    verbo: "Confirmar recepción",
    desc: "Al recibir el equipo, el cliente lo fotografía y confirma que llegó completo y funcionando.",
    checks: ["Recibí la cantidad completa", "No veo daños", "Probé el equipo y funciona"],
  },
  {
    k: "devolucion",
    quien: "cliente",
    titulo: "Devolución",
    verbo: "Registrar devolución",
    desc: "Antes de entregarlo de vuelta, el cliente fotografía el equipo completo y empacado.",
    checks: ["Entrego la cantidad completa", "El equipo va empacado en sus estuches", "Incluyo cables y accesorios"],
  },
  {
    k: "revision",
    quien: "compania",
    titulo: "Revisión final",
    verbo: "Confirmar revisión final",
    desc: "La compañía revisa el equipo en bodega. Si todo está bien, se cierra la reserva y se devuelve el depósito.",
    checks: ["Cantidades completas", "Sin daños nuevos", "Funciona correctamente"],
  },
];

export const TIPOS_CASO: Record<string, string> = {
  dano: "Daño en el equipo",
  faltante: "Faltante",
  no_funciona: "El equipo no funciona",
  retraso: "Retraso en la entrega o la recogida",
  cobro: "Cobro incorrecto",
  otro: "Otro",
};

export const MIN_FOTOS_PASO = 2;
export const MAX_FOTOS_PASO = 12;

// ---- Lo que muestra la tarjeta de entrega (fotos ya con enlace firmado) ----
export type ActaVista = {
  paso: Paso;
  autor_nombre: string;
  creado: string;
  checks: string[];
  nota: string | null;
  fotos: string[];
};

export type CasoVista = {
  id: string;
  codigo: string;
  tipo: string;
  descripcion: string;
  estado: "abierto" | "resuelto";
  creado: string;
  resuelto: string | null;
  resuelto_por_nombre: string | null;
  abierto_por_nombre: string;
  fotos: string[];
  mensajes: { autor_nombre: string; texto: string; creado: string }[];
};

export type Flujo = {
  id: string;
  codigo: string;
  estado: string;
  entrega: string;
  recogida: string;
  contraparte: string; // con quién: la compañía (para el cliente) o el cliente (para la compañía)
  lugar: string; // "Entrega en …" o "Retiro en bodega …"
  deposito: number;
  items: { nombre: string; cantidad: number }[];
  actas: ActaVista[];
  casos: CasoVista[];
};

// ¿Ese paso se puede registrar ahora? (las mismas reglas de registrar_acta en la base de datos)
export function pasoDisponible(f: Flujo, paso: Paso, ahora: number) {
  const hecho = (p: Paso) => f.actas.some((a) => a.paso === p);
  if (hecho(paso)) return false;
  if (paso === "salida") return f.estado === "confirmada";
  if (f.estado !== "en_curso" || !hecho("salida")) return false;
  if (paso === "devolucion") return hecho("recepcion");
  if (paso === "revision") return hecho("devolucion") || ahora >= Date.parse(f.recogida);
  return true;
}
