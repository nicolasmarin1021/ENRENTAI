import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ExplorarEquipos } from "@/componentes/explorar-equipos";
import { PasoCuando, PasoDonde, PasoQue } from "@/componentes/pasos";
import { Resultados } from "@/componentes/resultados";
import { Subpaneles, type Vista } from "@/componentes/subpaneles";
import { useCatalogo } from "@/lib/catalogo";
import { fechasSugeridas, usePedido } from "@/lib/pedido";
import { supabaseConfigurado } from "@/lib/supabase";
import { Aviso, Boton, Cargando, Pantalla } from "@/ui/base";

type Paso = 1 | 2 | 3 | "resultados";

// Buscar equipos (modo "Necesito equipos"), con dos subpaneles arriba:
// - Buscar equipos: el pedido guiado (qué, cuándo y dónde) y después el mapa con las compañías que
//   tienen equipos libres para el show. Cada paso arma su pantalla, con Atrás / Continuar fijos arriba.
// - Explorar: todos los equipos publicados, en lista o en el mapa (componentes/explorar-equipos.tsx).
// Otras pantallas pueden abrir un subpanel con ?vista=explorar (n cambia en cada visita).
export default function Buscar() {
  const { catalogo, cargando, error, recargar } = useCatalogo();
  const { pedido, guardar, cargado } = usePedido();
  const [elegido, setPaso] = useState<Paso | null>(null);
  const { vista: pedida, n } = useLocalSearchParams<{ vista?: string; n?: string }>();
  const [vista, setVista] = useState<Vista>(pedida === "explorar" ? "explorar" : "buscar");
  const [visita, setVisita] = useState(n);
  if (n !== visita) {
    // Llegó un enlace a un subpanel (p. ej. "Explorar equipos" desde Guardados).
    setVisita(n);
    setVista(pedida === "explorar" ? "explorar" : "buscar");
  }
  const completo = pedido.listo && pedido.lugar !== null && pedido.necesidades.length > 0 && pedido.entrega !== "";
  const paso: Paso = elegido ?? (completo ? "resultados" : 1);
  const equipos = catalogo.companias.flatMap((c) => c.equipos);
  const cabeza = <Subpaneles vista={vista} onCambio={setVista} />;

  // Con el pedido listo, el mapa ocupa toda la pantalla (como el mapa de Airbnb).
  if (vista === "buscar" && cargado && paso === "resultados" && completo && catalogo.companias.length > 0) {
    return <Resultados catalogo={catalogo} onEditar={setPaso} onExplorar={() => setVista("explorar")} />;
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
      <Pantalla fijo={cabeza}>
        {avisos}
        <Cargando texto="Cargando equipos disponibles en Medellín…" />
      </Pantalla>
    );
  }
  if (vista === "explorar") return <ExplorarEquipos cabeza={cabeza} avisos={avisos} />;
  if (paso === 2) return <PasoCuando cabeza={cabeza} avisos={avisos} refresco={refresco} onSiguiente={() => setPaso(3)} onAtras={() => setPaso(1)} />;
  if (paso === 3)
    return (
      <PasoDonde
        cabeza={cabeza}
        avisos={avisos}
        refresco={refresco}
        lugares={catalogo.lugares}
        onSiguiente={() => setPaso("resultados")}
        onAtras={() => setPaso(2)}
      />
    );
  return (
    <PasoQue
      cabeza={cabeza}
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
