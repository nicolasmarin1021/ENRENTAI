export type Punto = { lat: number; lng: number };

// Centro del mapa: Medellín (La Alpujarra / Centro).
export const MEDELLIN: Punto = { lat: 6.2442, lng: -75.5812 };
// Límites para no perderse fuera del Valle de Aburrá y el Oriente cercano (oeste, sur, este, norte).
export const LIMITES: [[number, number], [number, number]] = [
  [-75.78, 6.02],
  [-75.28, 6.48],
];
// Estilo de mapa claro y sobrio de OpenFreeMap (gratis, sin clave).
export const ESTILO_MAPA = "https://tiles.openfreemap.org/styles/positron";

// Distancia en línea recta, en km.
export function distanciaKm(a: Punto, b: Punto) {
  const R = 6371;
  const r = (x: number) => (x * Math.PI) / 180;
  const dLa = r(b.lat - a.lat);
  const dLo = r(b.lng - a.lng);
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const textoKm = (d: number) =>
  d < 10 ? `${d.toFixed(1).replace(".", ",")} km` : `${Math.round(d)} km`;

export type Transporte = {
  cobertura_km: number;
  transporte_modo: "fijo" | "variable";
  transporte_fijo: number;
  transporte_base: number;
  transporte_km: number;
};

// Costo de entrega y recogida (mismo cálculo del prototipo). null = no entrega a esa distancia.
export function costoTransporte(c: Transporte, km: number): number | null {
  if (c.cobertura_km <= 0 || km > c.cobertura_km) return null;
  if (c.transporte_modo === "fijo") return Math.round(c.transporte_fijo);
  return Math.round((c.transporte_base + c.transporte_km * km) / 1000) * 1000;
}
