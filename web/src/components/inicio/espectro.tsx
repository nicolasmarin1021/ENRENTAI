"use client";

import { useEffect, useRef } from "react";
import { v } from "./piezas";
import s from "./inicio.module.css";

// GUARDADO PARA MÁS ADELANTE: hoy la portada muestra la marquesina (marquesina.tsx). Para volver a usarlo,
// poner <Espectro /> en app/page.tsx en lugar de <Marquesina />.
// Franja oscura: un analizador de espectro RF, como el que usan los técnicos para coordinar frecuencias. Un cursor barre la banda y, a su paso, aparecen los equipos.
// Es decoración (aria-hidden): los equipos son ejemplos, no inventario real.

const N = 240; // puntos del trazo
const Y0 = 178; // piso del dibujo (viewBox 0 0 1000 200)
const ESC = 140; // alto de un pico completo
const BARRIDO = 6.5; // segundos que tarda el cursor en cruzar
const MANTIENE = 2.2; // segundos con todo encendido
const BAJA = 1; // segundos en que se apagan los picos
const CICLO = BARRIDO + MANTIENE + BAJA;

// x: posición en la banda (0 a 1) · alto: tamaño del pico · ancla: de dónde cuelga la etiqueta.
const PORTADORAS = [
  { x: 0.12, alto: 0.7, cat: "MIC", ref: "Shure ULXD4", mhz: "486.575", ancla: "22%" },
  { x: 0.31, alto: 0.58, cat: "IEM", ref: "Shure PSM1000", mhz: "512.825", ancla: "50%" },
  { x: 0.48, alto: 0.76, cat: "MIC", ref: "Sennheiser EW-DX", mhz: "536.250", ancla: "50%" },
  { x: 0.7, alto: 0.62, cat: "IEM", ref: "Sennheiser EW IEM G4", mhz: "566.600", ancla: "50%" },
  { x: 0.88, alto: 0.72, cat: "MIC", ref: "Shure Axient AD4Q", mhz: "591.450", ancla: "78%" },
];

// Fases fijas (sin azar) para que el servidor y el navegador dibujen lo mismo al cargar.
const FASE = Array.from({ length: N }, (_, i) => {
  const r = Math.sin(i * 12.9898) * 43758.5453;
  return (r - Math.floor(r)) * Math.PI * 2;
});

const suave = (x: number, a: number, b: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Trazo del espectro en el instante t con cada portadora a cierto nivel (0 a 1).
function trazo(t: number, niveles: number[], ruido?: Float32Array) {
  let camino = "";
  for (let i = 0; i < N; i++) {
    const x = i / (N - 1);
    // Piso de ruido + una meseta ancha (un canal de TV digital ocupando la banda).
    let y = 0.05 + 0.085 * suave(x, 0.575, 0.59) * (1 - suave(x, 0.63, 0.645));
    y += 0.016 * Math.sin(t * 1.3 + FASE[i]) + 0.011 * Math.sin(t * 2.9 + FASE[i] * 1.7) + (ruido ? ruido[i] : 0);
    for (let c = 0; c < PORTADORAS.length; c++) {
      const k = (x - PORTADORAS[c].x) / 0.011;
      y += niveles[c] * PORTADORAS[c].alto * (0.82 * Math.exp(-k * k) + 0.18 * Math.exp((-k * k) / 14));
    }
    camino += `${i ? "L" : "M"}${(x * 1000).toFixed(1)} ${(Y0 - y * ESC).toFixed(1)}`;
  }
  return camino;
}

const CIERRE = " L1000 200 L0 200 Z";
const INICIAL = trazo(0, PORTADORAS.map(() => 1));
// Altura de la punta de cada pico, en % del alto del dibujo, para colgar la etiqueta encima.
const punta = (alto: number) => `${((Y0 - (0.05 + alto) * ESC) / 200) * 100}%`;

export function Espectro() {
  const raiz = useRef<HTMLDivElement>(null);
  const linea = useRef<SVGPathElement>(null);
  const relleno = useRef<SVGPathElement>(null);
  const cursor = useRef<HTMLElement>(null);
  const etiquetas = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const el = raiz.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ruido = new Float32Array(N);
    // Arranca en la fase «todo encendido», igual a como lo dibujó el servidor.
    const inicio = performance.now() - BARRIDO * 1000;
    let raf = 0;
    let ultimo = 0;
    let activo = false;

    const cuadro = (ahora: number) => {
      raf = requestAnimationFrame(cuadro);
      if (ahora - ultimo < 33) return; // ~30 cuadros por segundo es suficiente
      ultimo = ahora;
      const t = (ahora - inicio) / 1000;
      const fase = t % CICLO;
      const x = fase < BARRIDO ? fase / BARRIDO : -1;
      const niveles = PORTADORAS.map((p, c) => {
        let n: number;
        if (fase < BARRIDO) n = Math.min(1, Math.max(0, (x - p.x) / 0.03));
        else if (fase < BARRIDO + MANTIENE) n = 1;
        else n = Math.max(0, 1 - (fase - BARRIDO - MANTIENE) / BAJA);
        return n * (1 + 0.05 * Math.sin(t * 7 + c * 2));
      });
      for (let i = 0; i < N; i++) ruido[i] = ruido[i] * 0.55 + (Math.random() - 0.5) * 0.024;
      const camino = trazo(t, niveles, ruido);
      linea.current?.setAttribute("d", camino);
      relleno.current?.setAttribute("d", camino + CIERRE);
      if (cursor.current) {
        cursor.current.style.left = `${Math.max(x, 0) * 100}%`;
        cursor.current.toggleAttribute("data-on", x >= 0);
      }
      etiquetas.current.forEach((e, c) => e?.toggleAttribute("data-on", niveles[c] > 0.6));
    };

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
    };
  }, []);

  return (
    <div ref={raiz} className={s.franja} aria-hidden="true">
      <div className={`wrap ${s.franjaCab}`}>
        <span>
          <i className={s.vivo} />
          Audio y RF para shows · <b>Medellín</b>
        </span>
        <span>470 – 608 MHz</span>
      </div>
      <div className={s.espectroArea}>
        <div className={s.lienzo}>
          <svg viewBox="0 0 1000 200" preserveAspectRatio="none" focusable="false">
            <defs>
              <linearGradient id="enrenta-espectro" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#8EA2F2" stopOpacity=".55" />
                <stop offset=".7" stopColor="#A08BF6" stopOpacity=".12" />
                <stop offset="1" stopColor="#A08BF6" stopOpacity="0" />
              </linearGradient>
            </defs>
            <g className={s.reticula}>
              {[40, 80, 120, 160].map((y) => (
                <line key={y} x1="0" x2="1000" y1={y} y2={y} />
              ))}
              {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((x) => (
                <line key={x} x1={x} x2={x} y1="0" y2="200" />
              ))}
            </g>
            <path ref={relleno} d={INICIAL + CIERRE} fill="url(#enrenta-espectro)" suppressHydrationWarning />
            <path ref={linea} className={s.linea} d={INICIAL} suppressHydrationWarning />
          </svg>
          <i ref={cursor} className={s.cursor} />
          {PORTADORAS.map((p, c) => (
            <span
              key={p.ref}
              ref={(e) => {
                etiquetas.current[c] = e;
              }}
              className={s.portadora}
              data-on=""
              style={v({ left: `${p.x * 100}%`, top: punta(p.alto), "--ancla": p.ancla })}
            >
              <b>{p.ref}</b>
              <small>
                {p.cat} · {p.mhz} MHz
              </small>
            </span>
          ))}
        </div>
        <div className={`wrap ${s.eje}`}>
          <span>470</span>
          <span>539</span>
          <span>608 MHz</span>
        </div>
      </div>
    </div>
  );
}
