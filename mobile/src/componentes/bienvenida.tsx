import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";
import type { Modo } from "@/lib/sesion";
import { Boton, Texto } from "@/ui/base";
import { Fondo } from "@/ui/fondo";
import { Icono, IconoCategoria } from "@/ui/iconos";
import { Logo, Simbolo } from "@/ui/marca";
import { tramo, useBucle } from "@/ui/movimiento";
import { color, fuente, margen, radio } from "@/tema";
import { Companias } from "./inicio/companias";
import { DemoPasos } from "./inicio/demo-pasos";
import { Marquesina } from "./inicio/marquesina";
import { VieneCompleta } from "./inicio/viene";

const NATIVO = Platform.OS !== "web";

// Lo que ofrece la BETA (lo mismo que la portada de la web, web/src/app/page.tsx).
const CONFIANZA = ["Compañías verificadas", "Disponibilidad real por fechas", "Cotiza por WhatsApp en un toque", "Gratis durante la BETA"];

// Pantalla de inicio: la persona elige si necesita equipos o si los tiene. Debajo, un abrebocas
// de cómo funciona ENRENTA (como la portada de la web): la marquesina de equipos, la demo de los
// cuatro pasos, lo que hace por las compañías y lo que viene en ENRENTA completa.
export function Bienvenida({ onElegir }: { onElegir: (m: Modo) => void }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // Ondas de radio alrededor del ícono y la flecha que invita a bajar.
  const ondas = useBucle(3000, 0);
  const baja = useBucle(1600, 0);
  // Entrada suave, una pieza tras otra.
  const [piezas] = useState(() => Array.from({ length: 5 }, () => new Animated.Value(0)));
  useEffect(() => {
    Animated.stagger(
      90,
      piezas.map((v) => Animated.spring(v, { toValue: 1, useNativeDriver: NATIVO, damping: 18, stiffness: 160 })),
    ).start();
  }, [piezas]);
  const aparece = (i: number) => ({
    opacity: piezas[i],
    transform: [{ translateY: piezas[i].interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
  });

  function elegir(m: Modo) {
    if (NATIVO) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onElegir(m);
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.fondo }}>
      {/* Fondo: dos manchas de luz lavanda, como la web. */}
      <Fondo>
        {(w, h) => (
          <>
            <Defs>
              <RadialGradient id="luz1" cx="88%" cy="2%" rx="75%" ry="38%">
                <Stop offset="0" stopColor="#DCE3FF" stopOpacity="1" />
                <Stop offset="1" stopColor="#DCE3FF" stopOpacity="0" />
              </RadialGradient>
              <RadialGradient id="luz2" cx="0%" cy="30%" rx="70%" ry="30%">
                <Stop offset="0" stopColor="#F0E8FE" stopOpacity="1" />
                <Stop offset="1" stopColor="#F0E8FE" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Rect width={w} height={h} fill="url(#luz1)" />
            <Rect width={w} height={h} fill="url(#luz2)" />
          </>
        )}
      </Fondo>

      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: insets.bottom + 32, paddingHorizontal: margen + 4, gap: 22 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={estilos.cabeza}>
          <Logo alto={22} />
          <View style={estilos.beta}>
            <Text style={estilos.betaTexto}>BETA</Text>
          </View>
        </View>

        <Animated.View style={[{ gap: 18, marginTop: 24 }, aparece(0)]}>
          {/* Ícono grande con la R (como el ícono de la app). */}
          <View style={estilos.icono}>
            {[0, 0.5].map((d) => (
              <Animated.View
                key={d}
                pointerEvents="none"
                style={[
                  estilos.onda,
                  d === 0
                    ? { opacity: tramo(ondas, [0, 0.7, 1], [0.45, 0, 0]), transform: [{ scale: tramo(ondas, [0, 0.7, 1], [1, 1.7, 1.7]) }] }
                    : { opacity: tramo(ondas, [0, 0.5, 0.501, 1], [0, 0, 0.45, 0.1]), transform: [{ scale: tramo(ondas, [0, 0.5, 0.501, 1], [1, 1, 1, 1.5]) }] },
                ]}
              />
            ))}
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
              <Defs>
                <LinearGradient id="fondoIcono" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor="#FFFFFF" />
                  <Stop offset="1" stopColor={color.acentoSuave} />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" rx={26} fill="url(#fondoIcono)" />
            </Svg>
            <View style={{ zIndex: 1 }}>
              <Simbolo tam={66} />
            </View>
          </View>
          <Text style={[estilos.titulo, width < 360 && { fontSize: 30, lineHeight: 35 }]}>
            ¿Qué te trae a <Text style={{ color: color.acento }}>ENRENTA</Text>?
          </Text>
          <Texto style={estilos.lead}>Renta y ofrece equipos para espectáculos en Medellín.</Texto>
        </Animated.View>

        <Animated.View style={aparece(1)}>
          <Opcion
            icono={<IconoCategoria cat="mic" tam={26} />}
            titulo="Necesito equipos"
            texto="Busca y renta lo que necesitas para tu show"
            onPress={() => elegir("necesito")}
          />
        </Animated.View>
        <Animated.View style={[{ marginTop: -8 }, aparece(2)]}>
          <Opcion
            icono={<Icono n="bodega" tam={26} tinta={color.acento} grosor={1.7} />}
            titulo="Tengo equipos"
            texto="Publica tu inventario y recibe cotizaciones por WhatsApp"
            onPress={() => elegir("tengo")}
          />
        </Animated.View>

        <Animated.View style={[estilos.confianza, aparece(3)]}>
          {CONFIANZA.map((t) => (
            <View key={t} style={estilos.item}>
              <Icono n="check" tam={17} tinta={color.ok} grosor={2.4} />
              <Texto style={{ fontSize: 15.5 }}>{t}</Texto>
            </View>
          ))}
        </Animated.View>

        <Animated.View style={[estilos.bajar, aparece(4)]}>
          <Texto v="fino" peso={600} style={{ letterSpacing: 1.2, fontSize: 11.5 }}>
            DESLIZA PARA VER CÓMO FUNCIONA
          </Texto>
          <Animated.View style={{ transform: [{ translateY: tramo(baja, [0, 0.5, 1], [0, 5, 0]) }, { rotate: "90deg" }] }}>
            <Icono n="flecha" tam={18} tinta={color.acento} grosor={2.2} />
          </Animated.View>
        </Animated.View>

        {/* Abrebocas: lo mismo que la portada de la web, adaptado al celular. */}
        <View style={{ marginHorizontal: -(margen + 4), marginTop: 6 }}>
          <Marquesina />
        </View>
        <View style={estilos.seccion}>
          <DemoPasos />
        </View>
        <View style={estilos.seccion}>
          <Companias />
        </View>
        <View style={estilos.seccion}>
          <VieneCompleta />
        </View>

        <View style={estilos.cierre}>
          <Simbolo tam={56} />
          <Text style={estilos.cierreTitulo}>
            ¿Listo para tu <Text style={{ color: color.acento }}>próximo show</Text>?
          </Text>
          <Texto v="fino" style={{ textAlign: "center", fontSize: 15, lineHeight: 21 }}>
            Gratis durante la BETA. Sin depósitos ni pagos en ENRENTA.
          </Texto>
          <Boton titulo="Necesito equipos" bloque onPress={() => elegir("necesito")} />
          <Boton titulo="Tengo equipos" tipo="secundario" bloque onPress={() => elegir("tengo")} />
        </View>

        <Texto v="fino" style={{ textAlign: "center" }}>
          ENRENTA BETA · Medellín, Colombia
        </Texto>
      </ScrollView>
    </View>
  );
}

function Opcion({ icono, titulo, texto, onPress }: { icono: React.ReactNode; titulo: string; texto: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${titulo}. ${texto}`}
      style={({ pressed }) => [estilos.opcion, pressed && { transform: [{ scale: 0.98 }], backgroundColor: "#FBFCFF" }]}
    >
      <View style={estilos.opcionIcono}>{icono}</View>
      <View style={{ flex: 1, gap: 4 }}>
        <Texto peso={600} style={{ fontSize: 19, letterSpacing: -0.3 }}>
          {titulo}
        </Texto>
        <Texto v="fino" style={{ fontSize: 14.5, lineHeight: 20 }}>
          {texto}
        </Texto>
      </View>
      <Icono n="flechaDerecha" tam={22} tinta={color.acento} grosor={2} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  cabeza: { flexDirection: "row", alignItems: "center", gap: 10 },
  beta: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: radio.pildora, backgroundColor: color.acentoSuave },
  betaTexto: { fontFamily: fuente[700], fontSize: 11, letterSpacing: 1, color: color.acento },
  icono: {
    width: 96,
    height: 96,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: color.acento,
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  titulo: { fontFamily: fuente[600], fontSize: 34, lineHeight: 40, letterSpacing: -1, color: color.tinta },
  lead: { fontSize: 17, lineHeight: 25, color: color.suave },
  opcion: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 20,
    borderRadius: 24,
    backgroundColor: color.superficie,
    borderWidth: 1,
    borderColor: color.linea,
    shadowColor: "#101828",
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  opcionIcono: { width: 58, height: 58, borderRadius: 18, backgroundColor: color.acentoSuave, alignItems: "center", justifyContent: "center" },
  confianza: { gap: 12, paddingHorizontal: 4 },
  onda: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 26, borderWidth: 2, borderColor: color.acento },
  bajar: { alignItems: "center", gap: 4, marginTop: 4 },
  seccion: { marginTop: 18 },
  cierre: { alignItems: "center", gap: 12, marginTop: 30, paddingHorizontal: 6 },
  cierreTitulo: { fontFamily: fuente[600], fontSize: 28, lineHeight: 33, letterSpacing: -0.8, color: color.tinta, textAlign: "center" },
  item: { flexDirection: "row", alignItems: "center", gap: 10 },
});
