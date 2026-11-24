import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { Circle, Defs, Pattern, RadialGradient, Rect, Stop } from "react-native-svg";
import { Cable, Fondo } from "@/ui/fondo";
import { movimientoReducido, NATIVO, tramo, useBucle } from "@/ui/movimiento";
import { color, fuente } from "@/tema";

// Franja oscura del inicio (como la marquesina de la portada web): los equipos que se rentan en
// ENRENTA pasan en letras grandes y dos luces de seguidor los barren. Es decoración.

const GRANDES = ["Consolas", "Luminarias", "Sistemas PA", "Racks", "Micrófonos", "Truss", "Monitores"];
const CHICOS = ["Cabezas móviles", "Subwoofers", "In-ears", "Máquinas de humo", "Intercom", "Pares LED", "Procesadores", "Antenas"];

function Fila({ palabras, grande, invertida, velocidad }: { palabras: string[]; grande?: boolean; invertida?: boolean; velocidad: number }) {
  const [mitad, setMitad] = useState(0);
  const [x] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!mitad || movimientoReducido()) return;
    x.setValue(invertida ? -mitad : 0);
    const a = Animated.loop(
      Animated.timing(x, { toValue: invertida ? 0 : -mitad, duration: mitad * velocidad, easing: Easing.linear, useNativeDriver: NATIVO }),
    );
    a.start();
    return () => a.stop();
  }, [mitad, invertida, velocidad, x]);
  return (
    <View style={{ overflow: "hidden" }}>
      <Animated.View style={[e.cinta, { transform: [{ translateX: x }] }]}>
        {[0, 1].map((k) => (
          <View key={k} style={e.tramo} onLayout={k === 0 ? (ev) => setMitad(ev.nativeEvent.layout.width) : undefined}>
            {palabras.map((p) => (
              <View key={p} style={e.palabra}>
                <Text style={grande ? e.grande : e.chico}>{p}</Text>
                <View style={[e.xlr, !grande && e.xlrChico]} />
              </View>
            ))}
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

export function Marquesina() {
  const [ancho, setAncho] = useState(0);
  const luz1 = useBucle(9000, 0.3);
  const luz2 = useBucle(12500, 0.7);
  // Cada luz va y viene como una cabeza móvil.
  const ir = (t: Animated.Value, desfase: number) =>
    tramo(t, [0, 0.5, 1], [-0.2 * ancho + desfase, 0.75 * ancho - desfase, -0.2 * ancho + desfase]);
  return (
    <View style={e.franja} onLayout={(ev) => setAncho(ev.nativeEvent.layout.width)} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Fondo>
        {(w, h) => (
          <>
            <Defs>
              <Pattern id="marqPuntos" width="18" height="18" patternUnits="userSpaceOnUse">
                <Circle cx="2" cy="2" r="1" fill="rgba(255,255,255,0.09)" />
              </Pattern>
            </Defs>
            <Rect width={w} height={h} fill="url(#marqPuntos)" />
          </>
        )}
      </Fondo>
      {ancho > 0 ? (
        <>
          <Animated.View style={[e.luz, { transform: [{ translateX: ir(luz1, 0) }] }]} pointerEvents="none">
            <Luz id="luzAzul" tinte="#8FA3F5" />
          </Animated.View>
          <Animated.View style={[e.luz, { transform: [{ translateX: ir(luz2, 40) }] }]} pointerEvents="none">
            <Luz id="luzCoral" tinte="#FF7A59" />
          </Animated.View>
        </>
      ) : null}
      <View style={e.cab}>
        <View style={e.vivo} />
        <Text style={e.cabTexto}>
          EQUIPOS PARA SHOWS · <Text style={{ color: "#FFFFFF", fontFamily: fuente[700] }}>MEDELLÍN</Text>
        </Text>
      </View>
      <Fila palabras={GRANDES} grande velocidad={28} />
      <Fila palabras={CHICOS} invertida velocidad={34} />
      <Cable alto={3} />
    </View>
  );
}

// Un haz de luz suave: brilla sobre las letras al pasar.
function Luz({ id, tinte }: { id: string; tinte: string }) {
  return (
    <Fondo>
      {(w, h) => (
        <>
          <Defs>
            <RadialGradient id={id} cx="50%" cy="60%" rx="50%" ry="60%">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.22" />
              <Stop offset="0.45" stopColor={tinte} stopOpacity="0.16" />
              <Stop offset="1" stopColor={tinte} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect width={w} height={h} fill={`url(#${id})`} />
        </>
      )}
    </Fondo>
  );
}

const e = StyleSheet.create({
  franja: { overflow: "hidden", paddingTop: 14, paddingBottom: 18, gap: 2, backgroundColor: color.tinta },
  cab: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, marginBottom: 4 },
  vivo: { width: 7, height: 7, borderRadius: 4, backgroundColor: color.coral },
  cabTexto: { fontFamily: fuente[500], fontSize: 10.5, letterSpacing: 1.6, color: "rgba(255,255,255,0.55)" },
  luz: { position: "absolute", top: 0, bottom: 0, width: 220 },
  cinta: { flexDirection: "row" },
  tramo: { flexDirection: "row", alignItems: "center" },
  palabra: { flexDirection: "row", alignItems: "center" },
  grande: { fontFamily: fuente[600], fontSize: 44, lineHeight: 54, letterSpacing: -1.6, color: "rgba(255,255,255,0.2)" },
  chico: { fontFamily: fuente[700], fontSize: 13, lineHeight: 26, letterSpacing: 2.4, color: "rgba(255,255,255,0.34)", textTransform: "uppercase" },
  xlr: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: "rgba(255,122,89,0.7)", marginHorizontal: 16 },
  xlrChico: { width: 9, height: 9, marginHorizontal: 12 },
});
