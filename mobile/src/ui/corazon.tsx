import * as Haptics from "expo-haptics";
import { useState } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useGuardados } from "@/lib/guardados";
import { color, fuente, radio } from "@/tema";

const CORAZON = "M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z";

// Botón ♡ para guardar un equipo en Guardados (redondo y blanco, para ir sobre las fotos).
export function Corazon({
  id,
  nombre,
  tam = 34,
  plano = false,
}: {
  id: string; // id del equipo
  nombre: string;
  tam?: number;
  plano?: boolean; // sin fondo blanco (sobre fondos claros)
}) {
  const { guardado, alternar } = useGuardados();
  const [escala] = useState(() => new Animated.Value(1));
  const activo = guardado(id);

  function tocar() {
    alternar(id);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    // Pequeño "latido" al tocar.
    Animated.sequence([
      Animated.spring(escala, { toValue: 1.25, useNativeDriver: Platform.OS !== "web", speed: 40, bounciness: 12 }),
      Animated.spring(escala, { toValue: 1, useNativeDriver: Platform.OS !== "web", speed: 30, bounciness: 8 }),
    ]).start();
  }

  return (
    <Pressable
      onPress={tocar}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
      accessibilityLabel={activo ? `Quitar ${nombre} de Guardados` : `Guardar ${nombre}`}
      style={[estilos.boton, { width: tam, height: tam, borderRadius: tam / 2 }, plano && { backgroundColor: "transparent", shadowOpacity: 0 }]}
    >
      <Animated.View style={{ transform: [{ scale: escala }] }}>
        <Svg viewBox="0 0 24 24" width={tam * 0.56} height={tam * 0.56}>
          <Path d={CORAZON} fill={activo ? color.coral : "rgba(30,34,48,0.18)"} stroke={activo ? color.coral : color.tinta} strokeWidth={1.8} strokeLinejoin="round" />
        </Svg>
      </Animated.View>
    </Pressable>
  );
}

// Botón grande "♡ Guardar" / "♥ Guardado" para la vista de un equipo (bien visible, debajo del nombre).
export function BotonGuardar({ id, nombre }: { id: string; nombre: string }) {
  const { guardado, alternar } = useGuardados();
  const activo = guardado(id);
  return (
    <Pressable
      onPress={() => {
        alternar(id);
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
      accessibilityLabel={activo ? `Quitar ${nombre} de Guardados` : `Guardar ${nombre}`}
      style={({ pressed }) => [estilos.pildora, activo && estilos.pildoraActiva, pressed && { opacity: 0.8 }]}
    >
      <Svg viewBox="0 0 24 24" width={20} height={20}>
        <Path d={CORAZON} fill={activo ? "#FFFFFF" : "transparent"} stroke={activo ? "#FFFFFF" : color.coral} strokeWidth={2} strokeLinejoin="round" />
      </Svg>
      <Text style={[estilos.pildoraTexto, activo && { color: "#FFFFFF" }]}>{activo ? "Guardado" : "Guardar"}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  pildora: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 44,
    paddingHorizontal: 20,
    borderRadius: radio.pildora,
    borderWidth: 1.5,
    borderColor: color.coral,
    backgroundColor: "#FFF5F2",
  },
  pildoraActiva: { backgroundColor: color.coral },
  pildoraTexto: { fontFamily: fuente[600], fontSize: 15.5, color: color.tinta },
  boton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.94)",
    shadowColor: "#101828",
    shadowOpacity: 0.18,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
});
