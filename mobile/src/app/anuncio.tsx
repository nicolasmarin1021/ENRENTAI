import { router } from "expo-router";
import { useEffect } from "react";
import { Panel, recordarAnuncio } from "@/componentes/anuncio-full";

// El anuncio «Lo que viene» (ENRENTA completa), como pantalla transparente encima de la actual.
export default function PantallaAnuncio() {
  // Al irse (con la ×, tocando afuera o con el gesto de atrás), se recuerda que ya se vio.
  useEffect(() => recordarAnuncio, []);
  return <Panel onCerrar={() => (router.canGoBack() ? router.back() : router.replace("/"))} />;
}
