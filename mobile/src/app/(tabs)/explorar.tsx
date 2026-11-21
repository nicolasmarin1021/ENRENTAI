import { useState } from "react";
import { PasoCuando, PasoDonde, PasoQue } from "@/componentes/pasos";
import { Resultados } from "@/componentes/resultados";
import { useCatalogo } from "@/lib/catalogo";
import { fechasSugeridas, usePedido } from "@/lib/pedido";
import { supabaseConfigurado } from "@/lib/supabase";
import { Aviso, Boton, Cargando, Pantalla } from "@/ui/base";

type Paso = 1 | 2 | 3 | "resultados";

// Explorar (modo "Necesito equipos"): primero el pedido guiado y después las compañías
// con equipos libres para el show. Cada paso arma su pantalla, con Atrás / Continuar fijos arriba.
export default function Explorar() {
  const { catalogo, cargando, error, recargar } = useCatalogo();
  const { pedido, guardar, cargado } = usePedido();
  const [elegido, setPaso] = useState<Paso | null>(null);
  const completo = pedido.listo && pedido.lugar !== null && pedido.necesidades.length > 0 && pedido.entrega !== "";
  const paso: Paso = elegido ?? (completo ? "resultados" : 1);
  const equipos = catalogo.companias.flatMap((c) => c.equipos);

  // Con el pedido listo, el mapa ocupa toda la pantalla (como el mapa de Airbnb).
  if (cargado && paso === "resultados" && completo && catalogo.companias.length > 0) {
    return <Resultados catalogo={catalogo} onEditar={setPaso} />;
  }

  // Avisos de conexión que van al comienzo de cualquier paso.
  const avisos =
    !supabaseConfigurado || error ? (
      <>
        {!supabaseConfigurado ? (
          <Aviso tono="aviso" texto="La app no encontró la conexión con Supabase (web/.env.local). Revisa ese archivo y vuelve a abrir la app." />
        ) : null}
        {error ? (
          <Aviso tono="mal" texto={error}>
            <Boton titulo="Reintentar" chico tipo="secundario" onPress={recargar} />
          </Aviso>
        ) : null}
      </>
    ) : null;
  const refresco = { refrescando: cargando && catalogo.companias.length > 0, onRefrescar: recargar };

  if (!cargado || (cargando && !catalogo.companias.length)) {
    return (
      <Pantalla>
        {avisos}
        <Cargando texto="Cargando equipos disponibles en Medellín…" />
      </Pantalla>
    );
  }
  if (paso === 2) return <PasoCuando avisos={avisos} refresco={refresco} onSiguiente={() => setPaso(3)} onAtras={() => setPaso(1)} />;
  if (paso === 3)
    return (
      <PasoDonde avisos={avisos} refresco={refresco} lugares={catalogo.lugares} onSiguiente={() => setPaso("resultados")} onAtras={() => setPaso(2)} />
    );
  return (
    <PasoQue
      avisos={avisos}
      refresco={refresco}
      categorias={catalogo.categorias}
      equipos={equipos}
      onSiguiente={() => {
        if (!pedido.entrega || !pedido.recogida) guardar((p) => ({ ...p, ...fechasSugeridas() }));
        setPaso(2);
      }}
    />
  );
}
