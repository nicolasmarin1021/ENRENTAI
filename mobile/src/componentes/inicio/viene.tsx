import { Animated, StyleSheet, Text, View } from "react-native";
import { Circle, Defs, Pattern, RadialGradient, Rect, Stop } from "react-native-svg";
import { abrirAnuncio } from "@/componentes/anuncio-full";
import { NOVEDADES_FULL } from "@/lib/novedades";
import { Boton } from "@/ui/base";
import { Fondo } from "@/ui/fondo";
import { Aparece, tramo, useBucle } from "@/ui/movimiento";
import { color, fuente, radio } from "@/tema";

// Adelanto de ENRENTA completa (inicio y Cómo funciona): tarjeta oscura con las novedades
// encendiéndose una por una. El botón abre el anuncio «Lo que viene» con todos los detalles.
export function VieneCompleta() {
  const foco = useBucle(9000, 0);
  const pulso = useBucle(1800, 0);
  const carga = useBucle(1800, 0.5);
  const n = NOVEDADES_FULL.length;
  return (
    <Aparece style={e.caja}>
      <Fondo>
        {(w, h) => (
          <>
            <Defs>
              <RadialGradient id="vieneLuz1" cx="100%" cy="0%" rx="80%" ry="50%">
                <Stop offset="0" stopColor="#6F86E8" stopOpacity="0.55" />
                <Stop offset="1" stopColor="#6F86E8" stopOpacity="0" />
              </RadialGradient>
              <RadialGradient id="vieneLuz2" cx="0%" cy="100%" rx="70%" ry="40%">
                <Stop offset="0" stopColor="#FF7A59" stopOpacity="0.3" />
                <Stop offset="1" stopColor="#FF7A59" stopOpacity="0" />
              </RadialGradient>
              <Pattern id="vienePuntos" width="18" height="18" patternUnits="userSpaceOnUse">
                <Circle cx="2" cy="2" r="1" fill="rgba(255,255,255,0.1)" />
              </Pattern>
            </Defs>
            <Rect width={w} height={h} fill="url(#vienePuntos)" />
            <Rect width={w} height={h} fill="url(#vieneLuz1)" />
            <Rect width={w} height={h} fill="url(#vieneLuz2)" />
          </>
        )}
      </Fondo>

      <View style={e.pill}>
        <View style={e.punto}>
          <Animated.View style={[e.puntoOnda, { opacity: tramo(pulso, [0, 1], [0.9, 0]), transform: [{ scale: tramo(pulso, [0, 1], [1, 3]) }] }]} />
        </View>
        <Text style={e.pillTexto}>PRÓXIMAMENTE</Text>
      </View>
      <Text style={e.titulo}>
        Viene ENRENTA <Text style={{ color: "#C9B8FF" }}>completa</Text>
      </Text>
      <Text style={e.texto}>Pagas en ENRENTA, el equipo sale y vuelve con fotos y, si algo falla, te respaldamos.</Text>
      <View style={e.prueba}>
        <View style={e.carga}>
          <Animated.View style={[e.cargaLuz, { transform: [{ translateX: tramo(carga, [0, 1], [-50, 120]) }] }]} />
        </View>
        <Text style={e.pruebaTexto}>EN PRUEBAS INTERNAS</Text>
      </View>

      <View style={e.lista}>
        {NOVEDADES_FULL.map((x, i) => {
          const a = i / n;
          const b = (i + 0.85) / n;
          return (
            <View key={x.titulo} style={e.novedad}>
              <Animated.View style={[e.novedadFoco, { opacity: tramo(foco, [0, a, a + 0.01, b, b + 0.01, 1], [0, 0, 1, 1, 0, 0]) }]} />
              <Text style={e.novedadTexto}>{x.titulo}</Text>
            </View>
          );
        })}
      </View>
      <Boton titulo="Ver todo lo que viene" tipo="secundario" onPress={abrirAnuncio} />
    </Aparece>
  );
}

const e = StyleSheet.create({
  caja: { borderRadius: 26, overflow: "hidden", padding: 22, gap: 14, backgroundColor: color.tinta },
  pill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radio.pildora,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  punto: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.coral },
  puntoOnda: { ...StyleSheet.absoluteFill, borderRadius: 4, backgroundColor: color.coral },
  pillTexto: { fontFamily: fuente[700], fontSize: 10.5, letterSpacing: 1.6, color: "#FFFFFF" },
  titulo: { fontFamily: fuente[600], fontSize: 30, lineHeight: 34, letterSpacing: -1, color: "#FFFFFF" },
  texto: { fontFamily: fuente[400], fontSize: 15, lineHeight: 22, color: "rgba(255,255,255,0.74)" },
  prueba: { flexDirection: "row", alignItems: "center", gap: 10 },
  carga: { width: 90, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.12)", overflow: "hidden" },
  cargaLuz: { width: 40, height: 4, borderRadius: 2, backgroundColor: color.coral },
  pruebaTexto: { fontFamily: fuente[500], fontSize: 10.5, letterSpacing: 1.4, color: "rgba(255,255,255,0.6)" },
  lista: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  novedad: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radio.pildora,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  novedadFoco: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(255,122,89,0.28)" },
  novedadTexto: { fontFamily: fuente[600], fontSize: 13, color: "#FFFFFF" },
});
