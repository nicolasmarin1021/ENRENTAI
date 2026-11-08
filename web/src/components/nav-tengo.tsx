import Link from "next/link";

// Navegación del modo "Tengo equipos".
export function NavTengo({ actual }: { actual: "panel" | "inventario" | "reservas" }) {
  const items = [
    { id: "panel", href: "/tengo/panel", texto: "Panel" },
    { id: "reservas", href: "/tengo/reservas", texto: "Reservas" },
    { id: "inventario", href: "/tengo/inventario", texto: "Inventario" },
  ] as const;
  return (
    <nav className="subnav" aria-label="Secciones de tu compañía">
      {items.map((i) => (
        <Link key={i.id} href={i.href} aria-current={actual === i.id ? "page" : undefined}>
          {i.texto}
        </Link>
      ))}
    </nav>
  );
}
