"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Simbolo } from "./brand";
import { ListaNovedades } from "./novedades";

// Anuncio de la BETA: muestra lo que trae ENRENTA completa.
// Aparece una vez al entrar; si la persona lo cierra, no vuelve a salir en 7 días.
// Desde el pie de página se puede abrir cuando se quiera ("Lo que viene").

const CLAVE = "enrenta:anuncio-full:v1";
const PAUSA = 7 * 24 * 60 * 60 * 1000;
const EVENTO = "enrenta:abrir-anuncio";

function yaLoVio() {
  try {
    const t = Number(localStorage.getItem(CLAVE));
    return Number.isFinite(t) && Date.now() - t < PAUSA;
  } catch {
    return false; // sin almacenamiento (p. ej. navegación privada estricta): se muestra
  }
}
function recordarQueLoVio() {
  try {
    localStorage.setItem(CLAVE, String(Date.now()));
  } catch {
    // no pasa nada: solo volvería a aparecer
  }
}

export function AnuncioFull() {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const abrir = () => {
      const d = ref.current;
      if (d && !d.open && !document.querySelector("dialog[open]")) d.showModal();
    };
    window.addEventListener(EVENTO, abrir);
    // Al entrar, con una pequeña pausa para no tapar la página mientras carga.
    const t = yaLoVio() ? null : setTimeout(abrir, 900);
    return () => {
      window.removeEventListener(EVENTO, abrir);
      if (t) clearTimeout(t);
    };
  }, []);

  const cerrar = () => ref.current?.close();

  return (
    <dialog ref={ref} className="anuncio" aria-labelledby="anuncio-titulo" onClose={recordarQueLoVio}>
      <div className="anuncio-hero">
        <div className="anuncio-txt">
          <span className="anuncio-pill">
            <i aria-hidden="true" />
            Próximamente
          </span>
          <h2 id="anuncio-titulo">
            Viene ENRENTA <span>completa</span>
          </h2>
          <p>
            Estamos terminando la versión que cuida cada renta de principio a fin: pagas en ENRENTA, el equipo sale y vuelve
            con fotos y, si algo falla, te respaldamos.
          </p>
        </div>
        <div className="anuncio-simbolo" aria-hidden="true">
          <Simbolo size={92} />
        </div>
        {/* Foco inicial arriba: si el foco fuera al botón del final, el anuncio abriría desplazado hacia abajo. */}
        <button type="button" className="anuncio-cerrar" aria-label="Cerrar" onClick={cerrar} autoFocus>
          ×
        </button>
      </div>

      <ListaNovedades conVistas />

      <div className="anuncio-ft">
        <p className="fine">
          Ya la estamos probando por dentro. Mientras tanto, usa la BETA gratis: cotiza por WhatsApp y califica a las
          compañías.
        </p>
        <div className="row-actions">
          <Link href="/como-funciona" className="link-btn" onClick={cerrar}>
            Cómo funciona la BETA
          </Link>
          <button type="button" className="btn primary" onClick={cerrar}>
            Seguir en la BETA
          </button>
        </div>
      </div>
    </dialog>
  );
}

// Enlace para volver a abrir el anuncio (pie de página y portada).
export function AbrirAnuncio({ texto = "Lo que viene", className = "link-btn pie-anuncio" }: { texto?: string; className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(EVENTO))}>
      {texto}
    </button>
  );
}
