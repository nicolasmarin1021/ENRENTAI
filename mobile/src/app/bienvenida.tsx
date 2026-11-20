import { router } from "expo-router";
import { Bienvenida } from "@/componentes/bienvenida";
import { useSesion } from "@/lib/sesion";

// La pantalla de inicio abierta desde Cuenta: al elegir, vuelve a las pestañas del modo elegido.
export default function PantallaBienvenida() {
  const { cambiarModo } = useSesion();
  return (
    <Bienvenida
      onElegir={(m) => {
        cambiarModo(m);
        if (router.canGoBack()) router.back();
        router.navigate(m === "tengo" ? "/panel" : "/explorar");
      }}
    />
  );
}
