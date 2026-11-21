import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, use, useCallback, useEffect, useState, type ReactNode } from "react";

// Guardados (♡), como las listas de favoritos de Airbnb: los EQUIPOS que la persona quiere rentar
// (no las compañías). Se guardan en el celular; no necesitan cuenta ni cambios en la base de datos.
// Igual que en la web (web/src/lib/guardados.ts).

const CLAVE = "enrenta:guardados:v1"; // { equipos: [...] } (las compañías de la versión anterior se ignoran)

const Contexto = createContext<{ equipos: string[]; guardado: (id: string) => boolean; alternar: (id: string) => void }>({
  equipos: [],
  guardado: () => false,
  alternar: () => {},
});

export function GuardadosProvider({ children }: { children: ReactNode }) {
  const [equipos, setEquipos] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(CLAVE)
      .then((crudo) => {
        if (!crudo) return;
        // Solo una lista de textos (si lo guardado está dañado, se ignora).
        const x = JSON.parse(crudo) as { equipos?: unknown } | null;
        if (Array.isArray(x?.equipos)) setEquipos(x.equipos.filter((i): i is string => typeof i === "string"));
      })
      .catch(() => {});
  }, []);

  const alternar = useCallback((id: string) => {
    setEquipos((actual) => {
      // Lo último que se guarda queda primero.
      const siguiente = actual.includes(id) ? actual.filter((x) => x !== id) : [id, ...actual];
      AsyncStorage.setItem(CLAVE, JSON.stringify({ equipos: siguiente })).catch(() => {});
      return siguiente;
    });
  }, []);

  const guardado = (id: string) => equipos.includes(id);

  return <Contexto value={{ equipos, guardado, alternar }}>{children}</Contexto>;
}

export const useGuardados = () => use(Contexto);
