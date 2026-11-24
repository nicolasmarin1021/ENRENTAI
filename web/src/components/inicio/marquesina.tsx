"use client";

import { useEffect, useRef } from "react";
import s from "./inicio.module.css";

// Franja oscura bajo la portada: los equipos que se rentan en ENRENTA pasan en letras grandes,
// como una marquesina, y dos seguidores de luz los barren. Con el ratón encima, la luz azul lo
// sigue. Es decoración (aria-hidden). La cinta se mueve con CSS; las luces, con JS.
// (El espectro RF de espectro.tsx quedó guardado para usarlo más adelante.)

const GRANDES = ["Consolas", "Luminarias", "Sistemas PA", "Racks", "Micrófonos", "Truss", "Monitores"];
const CHICOS = ["Cabezas móviles", "Subwoofers", "In-ears", "Máquinas de humo", "Intercom", "Pares LED", "Procesadores", "Antenas", "Cableado"];

// Separador: un conector XLR, como el de la R de la marca.
function Xlr() {
  return (
    <svg className={s.xlr} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="10.5" />
      <circle className={s.xlrPin} cx="8" cy="9.5" r="1.9" />
      <circle className={s.xlrPin} cx="16" cy="9.5" r="1.9" />
      <circle className={s.xlrPin} cx="12" cy="16" r="1.9" />
    </svg>
  );
}

// Una fila de la marquesina: la lista va dos veces para que el giro no tenga corte.
function Fila({ palabras, clase }: { palabras: string[]; clase: string }) {
  return (
    <div className={`${s.fila} ${clase}`}>
      <div className={s.cinta}>
        {[0, 1].map((k) => (
          <span key={k} className={s.tramo}>
            {palabras.map((p) => (
              <span key={p} className={s.palabra}>
                {p}
                <Xlr />
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}

function Filas() {
  return (
    <>
      <Fila palabras={GRANDES} clase={s.grande} />
      <Fila palabras={CHICOS} clase={s.chico} />
    </>
  );
}

export function Marquesina() {
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = raiz.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let ancho = el.clientWidth;
    let raton: number | null = null;
    let x1 = ancho * 0.3;
    let x2 = ancho * 0.7;
    let raf = 0;
    let activo = false;
    const inicio = performance.now();

    const cuadro = (ahora: number) => {
      raf = requestAnimationFrame(cuadro);
      const t = (ahora - inicio) / 1000;
      const borde = Math.min(160, ancho * 0.15);
      // Cada luz va y viene como una cabeza móvil; la azul se va hacia el ratón si está encima.
      const auto1 = ancho / 2 + (ancho / 2 - borde) * Math.sin(t * 0.55 - 0.9);
      const auto2 = ancho / 2 + (ancho / 2 - borde) * Math.sin(t * 0.41 + 1.6);
      x1 += ((raton ?? auto1) - x1) * (raton === null ? 0.06 : 0.16);
      x2 += (auto2 - x2) * 0.06;
      el.style.setProperty("--x1", `${x1.toFixed(1)}px`);
      el.style.setProperty("--x2", `${x2.toFixed(1)}px`);
    };

    const mover = (e: PointerEvent) => {
      if (e.pointerType === "mouse") raton = e.clientX - el.getBoundingClientRect().left;
    };
    const salir = () => {
      raton = null;
    };
    const medir = () => {
      ancho = el.clientWidth;
    };
    el.addEventListener("pointermove", mover);
    el.addEventListener("pointerleave", salir);
    window.addEventListener("resize", medir);

    // Solo se anima mientras se ve en pantalla.
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !activo) {
        activo = true;
        raf = requestAnimationFrame(cuadro);
      } else if (!e.isIntersecting && activo) {
        activo = false;
        cancelAnimationFrame(raf);
      }
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", mover);
      el.removeEventListener("pointerleave", salir);
      window.removeEventListener("resize", medir);
    };
  }, []);

  return (
    <div ref={raiz} className={s.franja} aria-hidden="true">
      <div className={`wrap ${s.franjaCab}`}>
        <span>
          <i className={s.vivo} />
          Equipos para shows · <b>Medellín</b>
        </span>
        <span className={s.pista}>Pasa el ratón: la luz te sigue</span>
      </div>
      <div className={s.marquesina}>
        <span className={`${s.seguidor} ${s.seguidor1}`} />
        <span className={`${s.seguidor} ${s.seguidor2}`} />
        <div className={s.capaBase}>
          <Filas />
        </div>
        <div className={s.capaLuz}>
          <Filas />
        </div>
      </div>
    </div>
  );
}
