// Identidad visual de ENRENTA (marca «Conector»), la misma de la web (web/src/app/globals.css).
// Una sola familia (Space Grotesk), paneles blancos, controles redondeados y un solo acento:
// el azul señal del cable del logo, para lo que se puede tocar.

export const color = {
  fondo: "#F7F8FC",
  superficie: "#FFFFFF",
  superficie2: "#F3F5FB",
  tinta: "#1E2230",
  suave: "#5A6072", // texto secundario
  linea: "#E9ECF4",
  lineaFuerte: "#D9DDE8",
  acento: "#3B5BDB", // azul señal
  acento2: "#6F86E8",
  acentoSuave: "#E8ECFD", // lavanda
  coral: "#FF7A59",
  ok: "#2E9B6A",
  okSuave: "#E7F6EE",
  aviso: "#A8670A",
  avisoSuave: "#FFF4E0",
  mal: "#D0493B",
  malSuave: "#FDEEEC",
  whatsapp: "#0E7C66",
} as const;

// Space Grotesk: cada grosor es una fuente distinta (se cargan en app/_layout.tsx).
export const fuente = {
  400: "SpaceGrotesk_400Regular",
  500: "SpaceGrotesk_500Medium",
  600: "SpaceGrotesk_600SemiBold",
  700: "SpaceGrotesk_700Bold",
} as const;
export type Peso = keyof typeof fuente;

export const radio = { sm: 12, md: 16, lg: 20, pildora: 999 } as const;

// Margen lateral de las pantallas.
export const margen = 16;

// Sombra suave de las tarjetas (iOS usa shadow*, Android usa elevation).
export const sombra = {
  shadowColor: "#101828",
  shadowOpacity: 0.08,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
} as const;
