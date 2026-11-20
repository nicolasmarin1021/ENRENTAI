import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import MapView, { Marker } from "react-native-maps";
import type { Punto } from "@/lib/geo";
import { color, fuente } from "@/tema";

// Mapa de Medellín (en el iPhone usa Apple Maps; en Android, Google Maps), al estilo de Airbnb:
// cada lugar es una píldora blanca con su precio o su nombre; la elegida se pone oscura.
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

const MARGEN_BASE: Margen = { top: 40, right: 40, bottom: 40, left: 40 };

export function Mapa({
  centro,
  delta = 0.14,
  marcadores = [],
  activo,
  onMarcador,
  onFondo,
  lugar,
  pin,
  onPin,
  foco,
  ajustar = false,
  margen = MARGEN_BASE,
  style,
  ref,
}: PropsMapa & { ref?: Ref<MapaRef> }) {
  const mapa = useRef<MapView>(null);
  const puntos = [...marcadores.map((m) => ({ latitude: m.lat, longitude: m.lng })), ...(lugar ? [{ latitude: lugar.lat, longitude: lugar.lng }] : [])];

  function encuadrar(animado = true) {
    if (puntos.length > 1) mapa.current?.fitToCoordinates(puntos, { edgePadding: margen, animated: animado });
    else if (puntos.length === 1)
      mapa.current?.animateToRegion({ ...puntos[0], latitudeDelta: 0.05, longitudeDelta: 0.05 }, animado ? 350 : 0);
  }

  useImperativeHandle(ref, () => ({ encuadrar: () => encuadrar(true) }));

  // Vuela hasta el lugar o la compañía elegida, sin cambiar el zoom.
  useEffect(() => {
    if (!foco) return;
    mapa.current?.animateCamera({ center: { latitude: foco.lat, longitude: foco.lng } }, { duration: 350 });
  }, [foco?.lat, foco?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={[estilos.caja, style]}>
      <MapView
        ref={mapa}
        style={StyleSheet.absoluteFill}
        initialRegion={{ latitude: centro.lat, longitude: centro.lng, latitudeDelta: delta, longitudeDelta: delta }}
        onMapReady={() => {
          if (ajustar) encuadrar(false);
        }}
        showsPointsOfInterests={false}
        showsCompass={false}
        toolbarEnabled={false}
        onPress={(e) => {
          if (e.nativeEvent.action === "marker-press") return;
          if (onPin) onPin({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude });
          else onFondo?.();
        }}
      >
        {lugar ? (
          <Marker coordinate={{ latitude: lugar.lat, longitude: lugar.lng }} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false} zIndex={2}>
            <View style={estilos.show}>
              <View style={estilos.showPunto} />
            </View>
          </Marker>
        ) : null}
        {marcadores.map((m) => {
          const sel = m.id === activo;
          const apagado = m.nivel === "nada";
          return (
            <Marker
              // La clave cambia con el estado para que el iPhone vuelva a dibujar la píldora.
              key={`${m.id}-${m.texto}-${m.nivel ?? ""}-${sel ? 1 : 0}`}
              coordinate={{ latitude: m.lat, longitude: m.lng }}
              onPress={() => onMarcador?.(m.id)}
              tracksViewChanges={false}
              zIndex={sel ? 20 : apagado ? 1 : 5}
            >
              {m.forma === "punto" && !sel ? (
                <View style={estilos.punto} />
              ) : (
                <View style={[estilos.pildora, sel && estilos.pildoraSel, apagado && !sel && estilos.pildoraApagada]}>
                  <Text style={[estilos.pildoraTexto, sel && { color: "#FFFFFF" }, apagado && !sel && { color: color.suave }]}>{m.texto}</Text>
                </View>
              )}
            </Marker>
          );
        })}
        {pin ? (
          <Marker
            coordinate={{ latitude: pin.lat, longitude: pin.lng }}
            draggable
            pinColor={color.acento}
            onDragEnd={(e) => onPin?.({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude })}
          />
        ) : null}
      </MapView>
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: { overflow: "hidden", backgroundColor: "#E9EEF2" },
  pildora: {
    paddingHorizontal: 11,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(16,24,40,0.08)",
    shadowColor: "#101828",
    shadowOpacity: 0.22,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  pildoraSel: { backgroundColor: color.tinta, borderColor: color.tinta, transform: [{ scale: 1.08 }] },
  pildoraApagada: { backgroundColor: "#F1F2F5" },
  pildoraTexto: { fontFamily: fuente[700], fontSize: 13.5, color: color.tinta },
  punto: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 4,
    borderColor: color.tinta,
    shadowColor: "#101828",
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  show: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(59,91,219,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  showPunto: { width: 14, height: 14, borderRadius: 7, backgroundColor: color.acento, borderWidth: 2.5, borderColor: "#FFFFFF" },
});
