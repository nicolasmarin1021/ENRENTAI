import type { CSSProperties } from "react";

// Piezas compartidas de la portada (app/page.tsx).

// Retraso de una animación en segundos: style={d(1.2)} → --d: 1.2s
export const d = (seg: number) => ({ "--d": `${seg}s` }) as CSSProperties;

// Variables CSS sueltas: style={v({ "--n": 8 })}
export const v = (o: Record<string, string | number>) => o as CSSProperties;

// Ícono de trazo (24×24), como los del resto de la web.
export function Ico({ d: trazo, size = 16, grueso = 1.8 }: { d: string; size?: number; grueso?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={grueso} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={trazo} />
    </svg>
  );
}

export const ICONOS = {
  lupa: "M10.5 4a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13zM15.5 15.5 20 20",
  mic: "M12 2.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zM9.6 9.2 10.8 21h2.4l1.2-11.8M10.2 13.5h3.6",
  iem: "M7 14a4 4 0 1 1 0-8M17 14a4 4 0 1 0 0-8M7 14v3a3 3 0 0 0 3 3M17 14v3a3 3 0 0 1-3 3",
  antena: "M12 21V10M8.5 6.5a5 5 0 0 1 7 0M5.8 3.8a9 9 0 0 1 12.4 0M12 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
  calendario: "M4 6.5h16V20H4zM4 10.5h16M8.5 4v4M15.5 4v4",
  pin: "M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  chat: "M4 5.5h16v10H9.5L5 19.5v-4H4z",
  pdf: "M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6",
  baja: "M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14",
  estrella: "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z",
  check: "m5 12.5 4.5 4.5L19 7.5",
  escudo: "M12 3 19 6v6c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6z",
  flecha: "M5 12h14M13 6l6 6-6 6",
};
