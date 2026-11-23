import { useEffect, useImperativeHandle, useRef, useState, type ComponentType, type Ref } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { WebView as WebViewOriginal, type WebViewMessageEvent, type WebViewProps } from "react-native-webview";
import type { Punto } from "@/lib/geo";
import { color } from "@/tema";
import { HTML_MAPA } from "./mapa-html";

// Mapa de Medellín, igual en iPhone y Android: un mapa abierto (OpenStreetMap, con el estilo de CARTO)
// dibujado con Leaflet dentro de una vista web. No necesita claves de Google ni de Apple.
// Al estilo de Airbnb: cada lugar es una píldora blanca con su texto; la elegida se pone oscura.
// En el navegador del computador se usa mapa.web.tsx (un mapa simplificado para revisar la app).

export type Nivel = "alto" | "medio" | "nada";
// forma "punto": un punto pequeño que solo muestra su nombre al elegirlo (para muchos lugares juntos).
export type Marcador = { id: string; lat: number; lng: number; texto: string; nivel?: Nivel; forma?: "pildora" | "punto" };
export type Margen = { top: number; right: number; bottom: number; left: number };

export type PropsMapa = {
  centro: Punto;
  delta?: number; // qué tanto se ve alrededor del centro al abrir (en grados)
  marcadores?: Marcador[];
  activo?: string | null;
  onMarcador?: (id: string) => void;
  onFondo?: () => void; // toque en el mapa, fuera de los marcadores
  lugar?: (Punto & { nombre: string }) | null; // el lugar del show (punto oscuro con anillo)
  pin?: Punto | null; // pin que la persona mueve
  onPin?: (p: Punto) => void;
  foco?: Punto | null; // cuando cambia, el mapa vuela hasta ese punto
  ajustar?: boolean; // al abrir, encuadra todos los marcadores
  margen?: Margen; // espacio libre en los bordes (por la barra de arriba y la tarjeta de abajo)
  style?: StyleProp<ViewStyle>;
};

export type MapaRef = { encuadrar: () => void };

// Los tipos de react-native-webview no encajan con esta versión de React: se describe lo que se usa.
type MetodosWeb = { injectJavaScript: (js: string) => void };
const WebView = WebViewOriginal as unknown as ComponentType<WebViewProps & { ref?: Ref<MetodosWeb> }>;

const MARGEN_BASE: Margen = { top: 40, right: 40, bottom: 40, left: 40 };

// Lo que el mapa web le avisa a la app.
type Aviso = { t: "listo" } | { t: "marcador"; id: string } | { t: "fondo" } | { t: "pin"; lat: number; lng: number };

export function Mapa({
  centro,
  delta = 0.14,
  marcadores = [],
  activo = null,
  onMarcador,
  onFondo,
  lugar = null,
  pin = null,
  onPin,
  foco,
  ajustar = false,
  margen = MARGEN_BASE,
  style,
  ref,
}: PropsMapa & { ref?: Ref<MapaRef> }) {
  const web = useRef<MetodosWeb>(null);
  const [listo, setListo] = useState(false);
  // Las funciones más recientes (el mapa web avisa en cualquier momento).
  const acciones = useRef({ onMarcador, onFondo, onPin });
  useEffect(() => {
    acciones.current = { onMarcador, onFondo, onPin };
  });

  const enviar = (msg: object) => web.current?.injectJavaScript(`window.enrenta && window.enrenta.recibir(${JSON.stringify(msg)}); true;`);

  // Lo que se dibuja: se manda de nuevo cada vez que cambia.
  const estado = JSON.stringify({ marcadores, activo, lugar, pin, editable: !!onPin, margen });
  useEffect(() => {
    if (listo) enviar({ t: "estado", ...JSON.parse(estado) });
  }, [estado, listo]);

  useImperativeHandle(ref, () => ({ encuadrar: () => enviar({ t: "encuadrar", animado: true }) }));

  // Vuela hasta el lugar o la compañía elegida, sin cambiar el zoom.
  useEffect(() => {
    if (listo && foco) enviar({ t: "volar", lat: foco.lat, lng: foco.lng });
  }, [foco?.lat, foco?.lng, listo]); // eslint-disable-line react-hooks/exhaustive-deps

  function alRecibir(e: WebViewMessageEvent) {
    let m: Aviso;
    try {
      m = JSON.parse(e.nativeEvent.data) as Aviso;
    } catch {
      return;
    }
    const a = acciones.current;
    if (m.t === "listo") {
      setListo(true);
      enviar({ t: "estado", ...JSON.parse(estado) });
      if (ajustar) enviar({ t: "encuadrar", animado: false });
    } else if (m.t === "marcador") a.onMarcador?.(m.id);
    else if (m.t === "pin") a.onPin?.({ lat: m.lat, lng: m.lng });
    else if (m.t === "fondo") {
      if (a.onPin) return; // en el mapa del pin, el toque ya movió el pin
      a.onFondo?.();
    }
  }

  // Zoom inicial a partir de cuánto se quiere ver (en grados) alrededor del centro.
  const zoom = Math.max(3, Math.min(17, Math.log2(360 / Math.max(delta, 0.002))));
  const html = HTML_MAPA.replace("__INICIO__", JSON.stringify({ lat: centro.lat, lng: centro.lng, zoom }));
  // El HTML se arma una sola vez (si cambiara, el mapa se recargaría).
  const [fuente] = useState(() => ({ html, baseUrl: "https://enrenta.co/" }));

  return (
    <View style={[estilos.caja, style]}>
      <WebView
        ref={web}
        source={fuente}
        originWhitelist={["*"]}
        onMessage={alRecibir}
        style={estilos.web}
        containerStyle={StyleSheet.absoluteFill}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        setSupportMultipleWindows={false}
        javaScriptEnabled
        domStorageEnabled
        cacheEnabled
        // Los enlaces del mapa (créditos de OpenStreetMap) no abren nada dentro de la app.
        onShouldStartLoadWithRequest={(r: { url: string }) => r.url === "about:blank" || r.url.startsWith("https://enrenta.co")}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: { overflow: "hidden", backgroundColor: "#E9EEF2" },
  web: { flex: 1, backgroundColor: color.superficie2 },
});
