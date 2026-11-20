import { useImperativeHandle, useState, type Ref } from "react";
import { Pressable, StyleSheet, Text, View, type GestureResponderEvent } from "react-native";
import { color, fuente } from "@/tema";
import type { MapaRef, PropsMapa } from "./mapa";

export type { Margen, MapaRef, Marcador, Nivel, PropsMapa } from "./mapa";

// Versión para el navegador del computador (solo para revisar la app): no hay mapa real, así
// que los lugares se dibujan en su posición sobre un fondo simple. En el iPhone se usa mapa.tsx.
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
  margen = { top: 40, right: 40, bottom: 40, left: 40 },
  style,
  ref,
}: PropsMapa & { ref?: Ref<MapaRef> }) {
  const [caja, setCaja] = useState({ w: 1, h: 1 });
  useImperativeHandle(ref, () => ({ encuadrar: () => {} }));

  // Límites: todos los puntos (o el centro) con un poco de aire.
  const todos = [...marcadores, ...(lugar ? [lugar] : []), ...(pin ? [pin] : [])];
  const lats = todos.length ? todos.map((p) => p.lat) : [centro.lat - delta / 2, centro.lat + delta / 2];
  const lngs = todos.length ? todos.map((p) => p.lng) : [centro.lng - delta / 2, centro.lng + delta / 2];
  const extra = 0.01;
  const [s, n] = [Math.min(...lats) - extra, Math.max(...lats) + extra];
  const [o, e] = [Math.min(...lngs) - extra, Math.max(...lngs) + extra];
  const anchoUtil = Math.max(1, caja.w - margen.left - margen.right);
  const altoUtil = Math.max(1, caja.h - margen.top - margen.bottom);
  const x = (lng: number) => margen.left + ((lng - o) / (e - o || 1)) * anchoUtil;
  const y = (lat: number) => margen.top + ((n - lat) / (n - s || 1)) * altoUtil;

  function alTocar(ev: GestureResponderEvent) {
    if (!onPin) return onFondo?.();
    const { locationX, locationY } = ev.nativeEvent;
    onPin({ lng: o + ((locationX - margen.left) / anchoUtil) * (e - o), lat: n - ((locationY - margen.top) / altoUtil) * (n - s) });
  }

  return (
    <View style={[estilos.caja, style]} onLayout={(ev) => setCaja({ w: ev.nativeEvent.layout.width, h: ev.nativeEvent.layout.height })}>
      <Pressable style={StyleSheet.absoluteFill} onPress={alTocar} accessibilityLabel="Fondo del mapa" />
      <Text style={estilos.marca}>Mapa simplificado (en el iPhone se ve Apple Maps)</Text>
      {lugar ? <View style={[estilos.show, { left: x(lugar.lng) - 13, top: y(lugar.lat) - 13 }]} pointerEvents="none" /> : null}
      {marcadores.map((m) => {
        const sel = m.id === activo;
        const apagado = m.nivel === "nada";
        if (m.forma === "punto" && !sel)
          return (
            <Pressable
              key={m.id}
              onPress={() => onMarcador?.(m.id)}
              accessibilityRole="button"
              accessibilityLabel={"Lugar en el mapa: " + m.texto}
              style={[estilos.punto, { left: x(m.lng) - 8, top: y(m.lat) - 8 }]}
            />
          );
        return (
          <Pressable
            key={m.id}
            onPress={() => onMarcador?.(m.id)}
            accessibilityRole="button"
            accessibilityLabel={`Lugar en el mapa: ${m.texto}`}
            style={[
              estilos.pildora,
              { left: x(m.lng), top: y(m.lat), zIndex: sel ? 20 : 5 },
              sel && { backgroundColor: color.tinta },
              apagado && !sel && { backgroundColor: "#F1F2F5" },
            ]}
          >
            <Text style={[estilos.pildoraTexto, sel && { color: "#FFFFFF" }, apagado && !sel && { color: color.suave }]}>{m.texto}</Text>
          </Pressable>
        );
      })}
      {pin ? <View style={[estilos.pin, { left: x(pin.lng) - 9, top: y(pin.lat) - 18 }]} pointerEvents="none" /> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: {
    overflow: "hidden",
    backgroundColor: "#E8EDE9",
    backgroundImage: "linear-gradient(rgba(255,255,255,.55) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.55) 1px, transparent 1px)",
    backgroundSize: "36px 36px",
  } as object,
  marca: { position: "absolute", left: 10, bottom: 8, fontFamily: fuente[400], fontSize: 11, color: "rgba(30,34,48,.45)" },
  pildora: {
    position: "absolute",
    transform: [{ translateX: "-50%" }, { translateY: "-50%" }],
    paddingHorizontal: 11,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    shadowColor: "#101828",
    shadowOpacity: 0.22,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  } as object,
  pildoraTexto: { fontFamily: fuente[700], fontSize: 13.5, color: color.tinta, whiteSpace: "nowrap" } as object,
  show: { position: "absolute", width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(59,91,219,0.22)", borderWidth: 7, borderColor: "rgba(59,91,219,0.22)" },
  punto: { position: "absolute", width: 16, height: 16, borderRadius: 8, backgroundColor: "#FFFFFF", borderWidth: 4, borderColor: color.tinta },
  pin: { position: "absolute", width: 18, height: 18, borderRadius: 9, backgroundColor: color.acento, borderWidth: 3, borderColor: "#FFFFFF" },
});
