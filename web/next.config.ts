import type { NextConfig } from "next";

// BETA (modelo de conexión por WhatsApp): estas secciones del modelo completo están ocultas.
// Sus páginas siguen en el código (y en la rama modelo-full); aquí solo se redirige a la
// sección equivalente para que ningún enlace quede roto. El chat (preguntas antes de cotizar,
// /necesito/chats y /tengo/mensajes) sí está activo en la BETA.
const OCULTAS_BETA = [
  { source: "/necesito/entregas", destination: "/necesito/reservas" },
  { source: "/necesito/pagos", destination: "/necesito/reservas" },
  { source: "/tengo/reservas", destination: "/tengo/panel" },
  { source: "/tengo/liquidaciones", destination: "/tengo/panel" },
];

// Encabezados de seguridad para todas las páginas:
// - nadie puede mostrar ENRENTA dentro de otra página (evita engaños con clics encima);
// - el navegador no adivina tipos de archivo;
// - al salir a otro sitio no se manda la dirección completa de la página;
// - la web no pide cámara, micrófono ni ubicación.
const ENCABEZADOS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: ENCABEZADOS }];
  },
  partialPrefetching: true,
  async redirects() {
    return [
      ...OCULTAS_BETA.map((r) => ({ ...r, permanent: false })),
      // El detalle de entregas de una reserva: a la compañía la lleva a su panel; al cliente, a sus solicitudes.
      {
        source: "/reservas/:id",
        has: [{ type: "query" as const, key: "de", value: "tengo" }],
        destination: "/tengo/panel",
        permanent: false,
      },
      { source: "/reservas/:id", destination: "/necesito/reservas", permanent: false },
    ];
  },
};

export default nextConfig;
