// Zonas del Valle de Aburrá (y Rionegro) para ubicar las bodegas.
// Las coordenadas son el centro aproximado de cada zona; cuando llegue el mapa
// real se reemplazan por la ubicación exacta de la dirección.
export type Zona = { id: string; nombre: string; municipio: string; lat: number; lng: number };

export const ZONAS: Zona[] = [
  { id: "poblado", nombre: "El Poblado", municipio: "Medellín", lat: 6.2088, lng: -75.568 },
  { id: "laureles", nombre: "Laureles – Estadio", municipio: "Medellín", lat: 6.245, lng: -75.59 },
  { id: "belen", nombre: "Belén", municipio: "Medellín", lat: 6.23, lng: -75.602 },
  { id: "guayabal", nombre: "Guayabal", municipio: "Medellín", lat: 6.215, lng: -75.585 },
  { id: "centro", nombre: "La Candelaria (Centro)", municipio: "Medellín", lat: 6.2476, lng: -75.5658 },
  { id: "america", nombre: "La América", municipio: "Medellín", lat: 6.256, lng: -75.605 },
  { id: "robledo", nombre: "Robledo", municipio: "Medellín", lat: 6.278, lng: -75.595 },
  { id: "castilla", nombre: "Castilla", municipio: "Medellín", lat: 6.295, lng: -75.573 },
  { id: "aranjuez", nombre: "Aranjuez", municipio: "Medellín", lat: 6.285, lng: -75.56 },
  { id: "buenosaires", nombre: "Buenos Aires", municipio: "Medellín", lat: 6.239, lng: -75.552 },
  { id: "envigado", nombre: "Envigado", municipio: "Envigado", lat: 6.171, lng: -75.587 },
  { id: "sabaneta", nombre: "Sabaneta", municipio: "Sabaneta", lat: 6.151, lng: -75.616 },
  { id: "itagui", nombre: "Itagüí", municipio: "Itagüí", lat: 6.172, lng: -75.611 },
  { id: "estrella", nombre: "La Estrella", municipio: "La Estrella", lat: 6.158, lng: -75.643 },
  { id: "bello", nombre: "Bello", municipio: "Bello", lat: 6.337, lng: -75.558 },
  { id: "copacabana", nombre: "Copacabana", municipio: "Copacabana", lat: 6.348, lng: -75.509 },
  { id: "rionegro", nombre: "Rionegro", municipio: "Rionegro", lat: 6.155, lng: -75.374 },
];

// Fecha y hora en Medellín (sirve igual en el servidor, que puede estar en otra zona horaria).
export const fechaCO = (iso: string) =>
  new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));

export const pesos = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
