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
