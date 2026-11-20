import { createContext, use, useEffect } from "react";

// Permite que una pantalla oculte la barra de pestañas de abajo mientras se ve (como el mapa de
// Airbnb: con el mapa en primer plano la barra se esconde; al subir la lista vuelve a aparecer).
export const BarraContexto = createContext<(oculta: boolean) => void>(() => {});

export function useBarraOculta(oculta: boolean) {
  const cambiar = use(BarraContexto);
  useEffect(() => {
    cambiar(oculta);
  }, [oculta, cambiar]);
  // Al salir de la pantalla, la barra vuelve.
  useEffect(() => () => cambiar(false), [cambiar]);
}
