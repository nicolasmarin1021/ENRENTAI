import { Text } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { color, fuente } from "@/tema";

// Íconos de categorías de equipo (los mismos trazos de la web: web/src/components/iconos.tsx).
const TRAZOS: Record<string, (c: string) => React.ReactNode> = {
  mic: () => (
    <>
      <Circle cx="12" cy="6" r="3.5" />
      <Path d="M9.6 9.2 10.8 21h2.4l1.2-11.8" />
      <Path d="M10.2 13.5h3.6" />
    </>
  ),
  iem: () => (
    <>
      <Rect x="4" y="8" width="9" height="13" rx="1.6" />
      <Path d="M6.5 8V3" />
      <Path d="M13 14c3.2 0 4.2-2.2 4.2-4.6" />
      <Circle cx="17.2" cy="7" r="2.2" />
      <Path d="M7 17h3" />
    </>
  ),
  antena: () => (
    <>
      <Path d="M12 13v8M8.5 21h7" />
      <Path d="M12 13 7 3h10z" />
      <Path d="M9.5 8h5" />
    </>
  ),
  coord: () => (
    <>
      <Path d="M3 20h18" />
      <Path d="m4 17 2-5 2 3 2-8 2 6 2-3 2 5 2-9 2 11" />
    </>
  ),
  consola: () => (
    <>
      <Rect x="3" y="5" width="18" height="14" rx="1.5" />
      <Path d="M7 8v8M12 8v8M17 8v8" />
      <Path d="M5.6 11.5h2.8M10.6 14h2.8M15.6 10h2.8" />
    </>
  ),
  pa: () => (
    <>
      <Path d="M5.5 3h13l-1.2 4H6.7z" />
      <Path d="M6.8 8.5h10.4l-1 3.8H7.8z" />
      <Path d="M8 13.8h8l-.8 3.6H8.8z" />
      <Path d="M12 17.5V21" />
    </>
  ),
  monitor: () => (
    <>
      <Path d="M3 18 9.5 7H21v11z" />
      <Circle cx="15.2" cy="12.8" r="3" />
    </>
  ),
  intercom: () => (
    <>
      <Path d="M5 13v-1a7 7 0 0 1 14 0v1" />
      <Rect x="3" y="13" width="4" height="6" rx="1" />
      <Rect x="17" y="13" width="4" height="6" rx="1" />
      <Path d="M19 19c0 1.6-2 2.5-5 2.5" />
    </>
  ),
};

export function IconoCategoria({ cat, tam = 20, tinta = color.acento }: { cat: string; tam?: number; tinta?: string }) {
  return (
    <Svg viewBox="0 0 24 24" width={tam} height={tam} fill="none" stroke={tinta} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      {(TRAZOS[cat] ?? TRAZOS.mic)(tinta)}
    </Svg>
  );
}

// Íconos de la interfaz (trazos de 24×24).
const UI: Record<string, string> = {
  mapa: "M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6zM9 4v14M15 6v14",
  editar: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",
  cerrar: "M6 6l12 12M18 6 6 18",
  flecha: "M9 5l7 7-7 7",
  atras: "M15 5l-7 7 7 7",
  check: "M5 12.5 10 17l9-10",
  camara: "M4 8.5h3.2l1.8-2.5h6l1.8 2.5H20V19H4zM12 16.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  foto: "M4 5h16v14H4zM4 15l4.5-4.5L13 15l2.5-2.5L20 17M15.5 9.5h.01",
  lugar: "M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  calendario: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  camion: "M3 6h11v10H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  persona: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5c1-3.8 4-5.5 7.5-5.5s6.5 1.7 7.5 5.5",
  escudo: "M12 3 19 6v6c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6zM9 12l2.2 2.2L15.5 10",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7.5h.01",
  buscar: "M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15zM16 16l5 5",
  mas: "M12 5v14M5 12h14",
  basura: "M4.5 7h15M9 7V4.5h6V7M6.5 7l1 13h9l1-13",
  salir: "M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10",
  ubicar: "M20 4 3.5 11l7.2 2.3L13 20.5z",
  compartir: "M12 15V3.5M8 7.5l4-4 4 4M5.5 11.5v8h13v-8",
  enlace: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  bodega: "M3.5 10 12 4.5l8.5 5.5v10h-17zM7.5 20v-6.5h9V20M7.5 16.5h9",
  flechaDerecha: "M4 12h15M13 6l6 6-6 6",
  corazon: "M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z",
};

export function Icono({ n, tam = 20, tinta = color.tinta, grosor = 1.8 }: { n: keyof typeof UI; tam?: number; tinta?: string; grosor?: number }) {
  return (
    <Svg viewBox="0 0 24 24" width={tam} height={tam} fill="none" stroke={tinta} strokeWidth={grosor} strokeLinecap="round" strokeLinejoin="round">
      <Path d={UI[n]} />
    </Svg>
  );
}

// Logo de WhatsApp simplificado (globo con teléfono), en blanco.
export function IconoWhatsApp({ tam = 18, tinta = "#FFFFFF" }: { tam?: number; tinta?: string }) {
  return (
    <Svg viewBox="0 0 24 24" width={tam} height={tam} fill="none" stroke={tinta} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 20l1.3-3.9A8.5 8.5 0 1 1 8.4 19z" />
      <Path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2.2-1.1-1 1c-1.2-.5-2.1-1.4-2.6-2.6l1-1-1.1-2.2z" />
    </Svg>
  );
}

// Estrellas de una reseña (solo para mostrar).
export function Estrellas({ valor, tam = 14 }: { valor: number; tam?: number }) {
  const llenas = Math.round(valor);
  return (
    <Text accessibilityLabel={`${valor} de 5 estrellas`} style={{ fontSize: tam, letterSpacing: 1, fontFamily: fuente[500] }}>
      <Text style={{ color: "#F0A52A" }}>{"★".repeat(llenas)}</Text>
      <Text style={{ color: color.lineaFuerte }}>{"★".repeat(5 - llenas)}</Text>
    </Text>
  );
}
