// Montos en pesos escritos a mano en los formularios: "150.000" ⇄ 150000.

// Deja solo los dígitos: "150.000" → 150000 (vacío → 0).
export const soloNumero = (v: string) => Number(v.replace(/\D/g, "") || 0);

// Escribe el número con puntos de miles mientras se teclea: "150000" → "150.000".
export const conPuntos = (v: string | number) => {
  const n = String(v).replace(/\D/g, "");
  return n ? Number(n).toLocaleString("es-CO") : "";
};
