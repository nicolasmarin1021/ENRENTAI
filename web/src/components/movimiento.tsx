"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

// Vida para toda la web (no cambia la estructura de ninguna página):
// - una onda que nace donde se toca un botón, pestaña, chip o tarjeta;
// - una barra con el color del cable de la marca, arriba, mientras carga la página siguiente;
// - un pulso en el botón de un formulario mientras se envía.
// El resto del movimiento (aparecer, abrir, cambiar de estado) es CSS: sección «Movimiento» de
// app/globals.css. Con «reducir movimiento» no hace nada.

const TOCABLES = [
  ".btn",
  ".chip",
  ".tabs a",
  ".role a",
  ".subnav a",
  ".seg-tabs a",
  ".subpaneles a",
  ".pcard",
  ".sug-item",
  ".pi-row",
  ".thread",
  ".acct-btn",
  ".acct-menu a",
  ".qty button",
  ".cerrar",
  ".lugar",
  ".seg label",
  ".g-toque",
].join(",");

// La onda: un círculo del color del texto que crece desde el punto tocado y se desvanece.
function ondear(el: HTMLElement, x: number, y: number) {
  const r = el.getBoundingClientRect();
  const capa = document.createElement("span");
  capa.className = "m-onda";
  capa.setAttribute("aria-hidden", "true");
  const gota = document.createElement("i");
  const tam = Math.hypot(r.width, r.height) * 2;
  gota.style.width = gota.style.height = `${tam}px`;
  gota.style.left = `${x - r.left - tam / 2}px`;
  gota.style.top = `${y - r.top - tam / 2}px`;
  capa.append(gota);
  const estatico = getComputedStyle(el).position === "static";
  if (estatico) el.style.position = "relative";
  el.append(capa);
  window.setTimeout(() => {
    capa.remove();
    if (estatico) el.style.position = "";
  }, 700);
}

export function Movimiento() {
  const ruta = usePathname();
  const barra = useRef<HTMLDivElement>(null);
  const anterior = useRef(ruta);

  // Llegó la página nueva: la barra se completa y se desvanece.
  useEffect(() => {
    if (anterior.current === ruta) return;
    anterior.current = ruta;
    const b = barra.current;
    if (!b || !b.dataset.estado) return;
    b.dataset.estado = "fin";
    const t = window.setTimeout(() => {
      if (b.dataset.estado === "fin") b.dataset.estado = "";
    }, 700);
    return () => window.clearTimeout(t);
  }, [ruta]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let arranque = 0;
    let seguro = 0;

    const tocar = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const el = (e.target as Element | null)?.closest<HTMLElement>(TOCABLES);
      if (!el || el.matches(":disabled, [aria-disabled='true']")) return;
      ondear(el, e.clientX, e.clientY);
    };

    // Clic en un enlace a otra página de ENRENTA: si tarda un poco, aparece la barra de carga.
    const clic = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      const b = barra.current;
      if (!b) return;
      window.clearTimeout(arranque);
      window.clearTimeout(seguro);
      arranque = window.setTimeout(() => {
        if (window.location.pathname === url.pathname) return; // ya llegó
        b.dataset.estado = "va";
      }, 120);
      // Por si la navegación no ocurre: la barra no se queda pegada.
      seguro = window.setTimeout(() => {
        if (b.dataset.estado === "va") b.dataset.estado = "";
      }, 10000);
    };

    // Mientras se envía un formulario, su botón late.
    const enviar = (e: SubmitEvent) => {
      const boton = e.submitter;
      if (!(boton instanceof HTMLElement)) return;
      boton.setAttribute("data-m-enviando", "");
      window.setTimeout(() => boton.removeAttribute("data-m-enviando"), 1400);
    };

    document.addEventListener("pointerdown", tocar, { passive: true });
    document.addEventListener("click", clic);
    document.addEventListener("submit", enviar, true);
    return () => {
      window.clearTimeout(arranque);
      window.clearTimeout(seguro);
      document.removeEventListener("pointerdown", tocar);
      document.removeEventListener("click", clic);
      document.removeEventListener("submit", enviar, true);
    };
  }, []);

  return (
    <div ref={barra} className="m-carga" aria-hidden="true">
      <i />
    </div>
  );
}
