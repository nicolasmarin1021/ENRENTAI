"use client";

import { useSyncExternalStore } from "react";

// ¿La pantalla es angosta (celular)? Se actualiza al girar o cambiar el tamaño.
export function useEsAngosto(consulta = "(max-width: 760px)") {
  return useSyncExternalStore(
    (aviso) => {
      const mq = window.matchMedia(consulta);
      mq.addEventListener("change", aviso);
      return () => mq.removeEventListener("change", aviso);
    },
    () => window.matchMedia(consulta).matches,
    () => false,
  );
}
