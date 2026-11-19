import type { NextConfig } from "next";

// BETA (modelo de conexión por WhatsApp): estas secciones del modelo completo están ocultas.
// Sus páginas siguen en el código (y en la rama modelo-full); aquí solo se redirige a la
// sección equivalente para que ningún enlace quede roto.
const OCULTAS_BETA = [
  { source: "/necesito/entregas", destination: "/necesito/reservas" },
  { source: "/necesito/chats", destination: "/necesito/reservas" },
  { source: "/necesito/pagos", destination: "/necesito/reservas" },
  { source: "/tengo/reservas", destination: "/tengo/panel" },
  { source: "/tengo/mensajes", destination: "/tengo/panel" },
  { source: "/tengo/liquidaciones", destination: "/tengo/panel" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
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
