"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

// Guardados (♡): los EQUIPOS que la persona quiere rentar (no las compañías), como las listas de
// favoritos de Airbnb. Igual que en la app (mobile/src/lib/guardados.tsx): se guardan en este
// navegador y no necesitan cuenta. Si se abren varias pestañas, todas ven los mismos guardados.

const CLAVE = "enrenta:guardados:v1"; // { equipos: [...] } (las compañías de la versión anterior se ignoran)
const VACIA: string[] = [];
const oyentes = new Set<() => void>();
let memoria: string | null | undefined; // undefined = aún no se ha leído

function leer() {
  if (memoria === undefined) {
    try {
      memoria = localStorage.getItem(CLAVE);
    } catch {
      memoria = null;
    }
  }
  return memoria;
}

function suscribir(aviso: () => void) {
  oyentes.add(aviso);
  // Cambios hechos en otra pestaña.
  const otraPestana = (e: StorageEvent) => {
    if (e.key !== CLAVE) return;
    memoria = e.newValue;
    aviso();
  };
  window.addEventListener("storage", otraPestana);
  return () => {
    oyentes.delete(aviso);
    window.removeEventListener("storage", otraPestana);
  };
}

// Solo una lista de textos: si lo guardado está dañado, se ignora.
function interpretar(crudo: string | null): string[] {
  if (!crudo) return VACIA;
  try {
    const x = JSON.parse(crudo) as { equipos?: unknown } | null;
    return Array.isArray(x?.equipos) ? x.equipos.filter((i): i is string => typeof i === "string") : VACIA;
  } catch {
    return VACIA;
  }
}

export function useGuardados() {
  const crudo = useSyncExternalStore(suscribir, leer, () => null);
  const equipos = useMemo(() => interpretar(crudo), [crudo]);

  const alternar = useCallback((id: string) => {
    const actual = interpretar(leer());
    // Lo último que se guarda queda primero.
    const siguiente = actual.includes(id) ? actual.filter((x) => x !== id) : [id, ...actual];
    memoria = JSON.stringify({ equipos: siguiente });
    try {
      localStorage.setItem(CLAVE, memoria);
    } catch {
      // Navegación privada o almacenamiento bloqueado: queda solo mientras la página esté abierta.
    }
    oyentes.forEach((f) => f());
  }, []);

  const guardado = useCallback((id: string) => equipos.includes(id), [equipos]);
  return { equipos, guardado, alternar, total: equipos.length };
}
