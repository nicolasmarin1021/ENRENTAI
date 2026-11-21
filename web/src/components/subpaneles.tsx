import Link from "next/link";

// Los dos subpaneles de "Buscar equipos" (igual que en la app, mobile/src/componentes/subpaneles.tsx):
// - Buscar equipos: el pedido guiado en 3 pasos y después el mapa con las compañías que lo tienen.
// - Explorar: todos los equipos publicados, en lista o en el mapa, sin armar un pedido.
export type Vista = "buscar" | "explorar";

export function Subpaneles({ vista, className = "" }: { vista: Vista; className?: string }) {
  return (
    <nav className={`subpaneles ${className}`} aria-label="Cómo buscar">
      <Link href="/explorar" aria-current={vista === "buscar" ? "page" : undefined} scroll={false}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4.5 4.5" />
        </svg>
        Buscar equipos
      </Link>
      <Link href="/explorar?vista=explorar" aria-current={vista === "explorar" ? "page" : undefined} scroll={false}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
          <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
          <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
          <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
        </svg>
        Explorar
      </Link>
    </nav>
  );
}
