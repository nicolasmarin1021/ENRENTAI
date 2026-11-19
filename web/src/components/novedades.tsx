import { NOVEDADES_FULL } from "@/lib/novedades";

// Tarjetas de lo que trae ENRENTA completa. Se usan en el anuncio y en «Cómo funciona».
export function ListaNovedades({ className = "" }: { className?: string }) {
  return (
    <ul className={`anuncio-grid ${className}`}>
      {NOVEDADES_FULL.map((n) => (
        <li key={n.titulo} className="anuncio-item">
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
          <b>{n.titulo}</b>
          <span>{n.texto}</span>
        </li>
      ))}
    </ul>
  );
}
