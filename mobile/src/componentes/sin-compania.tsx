import { router } from "expo-router";
import type { ReactNode } from "react";
import { useSesion } from "@/lib/sesion";
import { Boton, Cargando, Encabezado, Pantalla, Tarjeta, Texto } from "@/ui/base";

// Las pestañas de compañía necesitan una cuenta con compañía registrada.
// Si falta algo, muestra el paso que sigue; si no, dibuja la pantalla.
export function ConCompania({ titulo, children }: { titulo: string; children: (companiaId: string) => ReactNode }) {
  const { listo, usuario, compania } = useSesion();
  if (!listo) return <Cargando />;
  if (!usuario || !compania) {
    return (
      <Pantalla>
        <Encabezado titulo={titulo} />
        <Tarjeta>
          <Texto v="subtitulo">{usuario ? "Registra tu compañía" : "Publica tus equipos en ENRENTA"}</Texto>
          <Texto>
            {usuario
              ? "Con tu compañía registrada publicas tu inventario y recibes cotizaciones por WhatsApp. Gratis durante la BETA."
              : "Entra o crea tu cuenta para registrar tu compañía, publicar tu inventario y recibir cotizaciones por WhatsApp."}
          </Texto>
          <Boton titulo={usuario ? "Registrar mi compañía" : "Entrar"} onPress={() => router.push(usuario ? "/registro" : "/entrar")} />
        </Tarjeta>
      </Pantalla>
    );
  }
  return <>{children(compania.id)}</>;
}
