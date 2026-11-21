"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

// Guardados (♡): equipos y compañías que la persona marca, como las listas de favoritos de Airbnb.
// Igual que en la app (mobile/src/lib/guardados.tsx): se guardan en este navegador y no necesitan
// cuenta. Si se abren varias pestañas, todas ven los mismos guardados.

export type ListaGuardados = { equipos: string[]; companias: string[] };
export type TipoGuardado = keyof ListaGuardados;

const CLAVE = "enrenta:guardados:v1";
const VACIA: ListaGuardados = { equipos: [], companias: [] };
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

// Solo listas de textos: si lo guardado está dañado, se ignora.
const ids = (v: unknown) => (Array.isArray(v) ? v.filter((i): i is string => typeof i === "string") : []);
function interpretar(crudo: string | null): ListaGuardados {
  if (!crudo) return VACIA;
  try {
    const x = JSON.parse(crudo) as Partial<ListaGuardados> | null;
    return { equipos: ids(x?.equipos), companias: ids(x?.companias) };
  } catch {
    return VACIA;
  }
}

export function useGuardados() {
  const crudo = useSyncExternalStore(suscribir, leer, () => null);
  const lista = useMemo(() => interpretar(crudo), [crudo]);

  const alternar = useCallback((tipo: TipoGuardado, id: string) => {
    const actual = interpretar(leer());
    const ya = actual[tipo].includes(id);
    // Lo último que se guarda queda primero.
    const siguiente = { ...actual, [tipo]: ya ? actual[tipo].filter((x) => x !== id) : [id, ...actual[tipo]] };
    memoria = JSON.stringify(siguiente);
    try {
      localStorage.setItem(CLAVE, memoria);
    } catch {
      // Navegación privada o almacenamiento bloqueado: queda solo mientras la página esté abierta.
    }
    oyentes.forEach((f) => f());
  }, []);

  const guardado = useCallback((tipo: TipoGuardado, id: string) => lista[tipo].includes(id), [lista]);
  return { lista, guardado, alternar, total: lista.equipos.length + lista.companias.length };
}
