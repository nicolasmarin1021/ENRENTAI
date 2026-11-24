import { NOVEDADES_FULL } from "@/lib/novedades";
import { VISTAS } from "./novedades-vistas";

// Tarjetas de lo que trae ENRENTA completa. Se usan en el anuncio y en «Cómo funciona».
// Con conVistas (el anuncio), cada tarjeta lleva arriba una viñeta animada en vez del ícono.
export function ListaNovedades({ className = "", conVistas = false }: { className?: string; conVistas?: boolean }) {
  return (
    <ul className={`anuncio-grid ${conVistas ? "con-vistas" : ""} ${className}`}>
      {NOVEDADES_FULL.map((n) => {
        const Vista = conVistas ? VISTAS[n.titulo] : undefined;
        return (
          <li key={n.titulo} className="anuncio-item">
            {Vista ? (
              <Vista />
            ) : (
              <span className="anuncio-ico" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  width={22}
                  height={22}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={n.icono} />
                </svg>
              </span>
            )}
            <b>{n.titulo}</b>
            <span>{n.texto}</span>
          </li>
        );
      })}
    </ul>
  );
}
