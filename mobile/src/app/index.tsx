import { Redirect, router } from "expo-router";
import { Bienvenida } from "@/componentes/bienvenida";
import { useSesion } from "@/lib/sesion";
import { Cargando } from "@/ui/base";

// Al abrir la app: la primera vez se muestra la pantalla de inicio para elegir cómo usarla;
// después, va directo a la primera pestaña del modo elegido.
export default function Inicio() {
  const { listo, modo, modoElegido, cambiarModo } = useSesion();
  if (!listo) return <Cargando texto="Abriendo ENRENTA…" />;
  if (!modoElegido) {
    return (
      <Bienvenida
        onElegir={(m) => {
          cambiarModo(m);
          router.replace(m === "tengo" ? "/panel" : "/buscar");
        }}
      />
    );
  }
  return <Redirect href={modo === "tengo" ? "/panel" : "/buscar"} />;
}
