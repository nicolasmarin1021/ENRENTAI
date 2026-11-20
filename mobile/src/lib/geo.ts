// Distancias y costo de transporte (igual que web/src/lib/geo.ts).

export type Punto = { lat: number; lng: number };

// Centro del mapa: Medellín (La Alpujarra / Centro).
export const MEDELLIN: Punto = { lat: 6.2442, lng: -75.5812 };

// Distancia en línea recta, en km.
export function distanciaKm(a: Punto, b: Punto) {
  const R = 6371;
  const r = (x: number) => (x * Math.PI) / 180;
  const dLa = r(b.lat - a.lat);
  const dLo = r(b.lng - a.lng);
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const textoKm = (d: number) => (d < 10 ? `${d.toFixed(1).replace(".", ",")} km` : `${Math.round(d)} km`);

export type Transporte = {
  cobertura_km: number;
  transporte_modo: "fijo" | "variable";
  transporte_fijo: number;
  transporte_base: number;
  transporte_km: number;
};

// Costo de entrega y recogida. null = no entrega a esa distancia.
export function costoTransporte(c: Transporte, km: number): number | null {
  if (c.cobertura_km <= 0 || km > c.cobertura_km) return null;
  if (c.transporte_modo === "fijo") return Math.round(c.transporte_fijo);
  return Math.round((c.transporte_base + c.transporte_km * km) / 1000) * 1000;
}

// Precio de referencia de la BETA: alquiler + transporte + técnico (sin cobros de ENRENTA).
export function cotizar(
  c: Transporte & Punto & { tecnico_tarifa_dia: number | null },
  items: { precio_dia: number; cantidad: number }[],
  dias: number,
  lugar: Punto,
  modalidad: "entrega" | "retiro",
  tecnico: boolean,
) {
  const alquiler = items.reduce((a, i) => a + i.precio_dia * i.cantidad * dias, 0);
  const km = distanciaKm(c, lugar);
  const costoEntrega = costoTransporte(c, km);
  const transporte = modalidad === "entrega" ? (costoEntrega ?? 0) : 0;
  const tecnicoValor = tecnico && c.tecnico_tarifa_dia ? c.tecnico_tarifa_dia * dias : 0;
  return {
    alquiler,
    transporte,
    tecnico: tecnicoValor,
    referencia: alquiler + transporte + tecnicoValor,
    km,
    puedeEntregar: costoEntrega !== null,
  };
}
