import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, use, useCallback, useEffect, useState, type ReactNode } from "react";

// Guardados (♡), como las listas de favoritos de Airbnb: equipos y compañías que la persona marca.
// Se guardan en el celular; no necesitan cuenta ni cambios en la base de datos.

type Lista = { equipos: string[]; companias: string[] };
type Tipo = keyof Lista;

const CLAVE = "enrenta:guardados:v1";
const VACIA: Lista = { equipos: [], companias: [] };

const Contexto = createContext<{ lista: Lista; guardado: (tipo: Tipo, id: string) => boolean; alternar: (tipo: Tipo, id: string) => void }>({
  lista: VACIA,
  guardado: () => false,
  alternar: () => {},
});

export function GuardadosProvider({ children }: { children: ReactNode }) {
  const [lista, setLista] = useState<Lista>(VACIA);

  useEffect(() => {
    AsyncStorage.getItem(CLAVE)
      .then((crudo) => {
        if (!crudo) return;
        // Solo listas de textos (si lo guardado está dañado, se ignora).
        const x = JSON.parse(crudo) as Partial<Lista> | null;
        const ids = (v: unknown) => (Array.isArray(v) ? v.filter((i): i is string => typeof i === "string") : []);
        setLista({ equipos: ids(x?.equipos), companias: ids(x?.companias) });
      })
      .catch(() => {});
  }, []);

  const alternar = useCallback((tipo: Tipo, id: string) => {
    setLista((actual) => {
      const ya = actual[tipo].includes(id);
      // Lo último que se guarda queda primero.
      const siguiente = { ...actual, [tipo]: ya ? actual[tipo].filter((x) => x !== id) : [id, ...actual[tipo]] };
      AsyncStorage.setItem(CLAVE, JSON.stringify(siguiente)).catch(() => {});
      return siguiente;
    });
  }, []);

  const guardado = (tipo: Tipo, id: string) => lista[tipo].includes(id);

  return <Contexto value={{ lista, guardado, alternar }}>{children}</Contexto>;
}

export const useGuardados = () => use(Contexto);
