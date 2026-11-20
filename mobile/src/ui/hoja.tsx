import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, PanResponder, Platform, ScrollView, StyleSheet, View } from "react-native";
import { color } from "@/tema";

// Panel que sube desde abajo sobre el mapa (como la lista de Airbnb). Se arrastra desde su
// cabecera y queda en una de tres alturas: abajo (solo la cabecera), al medio o arriba.
// Tocar la cabecera también lo sube o lo baja.

export type PosicionHoja = "oculta" | "abajo" | "medio" | "arriba";

const NATIVO = Platform.OS !== "web";
const RESORTE = { useNativeDriver: NATIVO, damping: 24, stiffness: 230, mass: 0.9 };

export function Hoja({
  alto,
  arriba,
  asomada,
  posicion,
  onPosicion,
  cabeza,
  children,
}: {
  alto: number; // alto de la pantalla disponible
  arriba: number; // dónde queda el borde de arriba cuando está abierta del todo
  asomada: number; // cuánto se ve cuando está abajo (cabecera + barra de pestañas)
  posicion: PosicionHoja;
  onPosicion: (p: PosicionHoja) => void;
  cabeza: ReactNode;
  children: ReactNode;
}) {
  const puntos: Record<PosicionHoja, number> = {
    arriba,
    medio: Math.round(alto * 0.46),
    abajo: alto - asomada,
    oculta: alto + 24,
  };
  const [y] = useState(() => new Animated.Value(alto + 24));
  // Lo último que se sabe, para usarlo dentro de los gestos.
  const ultimo = useRef({ puntos, posicion, onPosicion, inicio: 0 });
  useEffect(() => {
    ultimo.current.puntos = puntos;
    ultimo.current.posicion = posicion;
    ultimo.current.onPosicion = onPosicion;
  });

  useEffect(() => {
    Animated.spring(y, { toValue: puntos[posicion], ...RESORTE }).start();
  }, [y, posicion, puntos.arriba, puntos.medio, puntos.abajo, puntos.oculta]); // eslint-disable-line react-hooks/exhaustive-deps

  // El gesto lee `ultimo` solo mientras la persona arrastra (nunca al dibujar), por eso no hay riesgo.
  // eslint-disable-next-line react-hooks/refs
  const [gesto] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 4,
      onPanResponderGrant: () => {
        y.stopAnimation((v) => {
          ultimo.current.inicio = v;
        });
      },
      onPanResponderMove: (_e, g) => {
        const p = ultimo.current.puntos;
        y.setValue(Math.min(p.abajo + 40, Math.max(p.arriba - 20, ultimo.current.inicio + g.dy)));
      },
      onPanResponderRelease: (_e, g) => {
        const { puntos: p, posicion: actualPos } = ultimo.current;
        const actual = ultimo.current.inicio + g.dy;
        let destino: PosicionHoja;
        if (Math.abs(g.dy) < 5 && Math.abs(g.dx) < 5) destino = actualPos === "abajo" ? "medio" : "abajo"; // toque
        else if (g.vy < -0.5) destino = actual > p.medio ? "medio" : "arriba";
        else if (g.vy > 0.5) destino = actual < p.medio ? "medio" : "abajo";
        else
          destino = (["arriba", "medio", "abajo"] as const).reduce((a, b) => (Math.abs(p[b] - actual) < Math.abs(p[a] - actual) ? b : a));
        Animated.spring(y, { toValue: p[destino], ...RESORTE }).start();
        ultimo.current.onPosicion(destino);
      },
    }),
  );

  return (
    <Animated.View style={[estilos.hoja, { height: alto - arriba, transform: [{ translateY: y }] }]}>
      <View {...gesto.panHandlers} style={estilos.cabeza} accessibilityRole="adjustable" accessibilityHint="Arrastra o toca para ver la lista">
        <View style={estilos.asa} />
        {cabeza}
      </View>
      {/* Abajo solo se ve la cabecera: la lista aparece a medida que el panel sube. */}
      <Animated.View
        style={{ flex: 1, opacity: y.interpolate({ inputRange: [puntos.medio, puntos.abajo - 1, puntos.abajo], outputRange: [1, 0, 0], extrapolate: "clamp" }) }}
        pointerEvents={posicion === "abajo" || posicion === "oculta" ? "none" : "auto"}
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: alto - puntos.medio + 32, gap: 18 }}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  hoja: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: color.superficie,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#101828",
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  cabeza: { alignItems: "center", paddingTop: 8, paddingBottom: 12, paddingHorizontal: 16, gap: 8 },
  asa: { width: 40, height: 5, borderRadius: 3, backgroundColor: color.lineaFuerte },
});
