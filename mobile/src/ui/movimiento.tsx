import { useEffect, useRef, useState, type ReactNode } from "react";
import { AccessibilityInfo, Animated, Easing, Platform, type StyleProp, type ViewStyle } from "react-native";

// Movimiento de la app (equivale a la sección «Movimiento» de web/src/app/globals.css):
// piezas que aparecen, que responden al tocar, que saltan al cambiar y bucles para las demos.
// Con «Reducir movimiento» activado en el celular, todo queda quieto en su estado final.

export const NATIVO = Platform.OS !== "web";

let reducir = false;
AccessibilityInfo.isReduceMotionEnabled()
  .then((v) => {
    reducir = v;
  })
  .catch(() => {});
try {
  AccessibilityInfo.addEventListener("reduceMotionChanged", (v) => {
    reducir = v;
  });
} catch {
  // algunas plataformas no avisan del cambio: basta con el valor inicial
}
export const movimientoReducido = () => reducir;

// Cascada automática: las piezas que aparecen casi al mismo tiempo (una lista de tarjetas)
// se escalonan solas, una tras otra.
let ultimaVez = 0;
let enCola = 0;
function turnoCascada(paso = 60, tope = 6) {
  const ahora = Date.now();
  if (ahora - ultimaVez > 180) enCola = 0;
  ultimaVez = ahora;
  return Math.min(enCola++, tope) * paso;
}

// Valor que va de 0 a 1 al montar la pieza. retraso: milisegundos o "cascada".
export function useAparecer(retraso: number | "cascada" = 0, duracion = 480) {
  const [v] = useState(() => new Animated.Value(reducir ? 1 : 0));
  useEffect(() => {
    if (reducir) {
      v.setValue(1);
      return;
    }
    const a = Animated.timing(v, {
      toValue: 1,
      duration: duracion,
      delay: retraso === "cascada" ? turnoCascada() : retraso,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: NATIVO,
    });
    a.start();
    return () => a.stop();
  }, [v, retraso, duracion]);
  return v;
}

type Desde = "abajo" | "arriba" | "izquierda" | "derecha" | "nada";
const DESPLAZA: Record<Desde, { x?: number; y?: number }> = {
  abajo: { y: 16 },
  arriba: { y: -14 },
  izquierda: { x: -18 },
  derecha: { x: 22 },
  nada: {},
};

// Envoltura que hace aparecer su contenido (sube y se aclara).
export function Aparece({
  children,
  retraso = "cascada",
  desde = "abajo",
  escala,
  style,
}: {
  children?: ReactNode;
  retraso?: number | "cascada";
  desde?: Desde;
  escala?: number; // empieza un poco más pequeño (0.9 = 90 %)
  style?: StyleProp<ViewStyle>;
}) {
  const v = useAparecer(retraso);
  const d = DESPLAZA[desde];
  const transform: ({ translateX: Animated.AnimatedInterpolation<number> } | { translateY: Animated.AnimatedInterpolation<number> } | { scale: Animated.AnimatedInterpolation<number> })[] = [];
  if (d.x) transform.push({ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [d.x, 0] }) });
  if (d.y) transform.push({ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [d.y, 0] }) });
  if (escala) transform.push({ scale: v.interpolate({ inputRange: [0, 1], outputRange: [escala, 1] }) });
  return <Animated.View style={[style, { opacity: v, transform }]}>{children}</Animated.View>;
}

// Al tocar: la pieza se hunde un poco y vuelve con un pequeño rebote.
export function usePresion(hasta = 0.96) {
  const [escala] = useState(() => new Animated.Value(1));
  const ir = (a: number) => {
    if (reducir) return;
    Animated.spring(escala, { toValue: a, useNativeDriver: NATIVO, speed: 40, bounciness: a === 1 ? 9 : 0 }).start();
  };
  return { escala, onPressIn: () => ir(hasta), onPressOut: () => ir(1) };
}

// Cuando cambia `clave` (un estado, un número, una opción elegida), la pieza da un salto.
export function useSalto(clave: unknown, desde = 0.82) {
  const [v] = useState(() => new Animated.Value(1));
  const previo = useRef(clave);
  useEffect(() => {
    if (Object.is(previo.current, clave)) return;
    previo.current = clave;
    if (reducir) return;
    v.setValue(desde);
    Animated.spring(v, { toValue: 1, useNativeDriver: NATIVO, friction: 4, tension: 170 }).start();
  }, [clave, v, desde]);
  return v;
}

// Cuando aparece un error (clave con valor), la pieza tiembla de lado a lado.
export function useTemblor(clave: unknown) {
  const [x] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!clave || reducir) return;
    Animated.sequence(
      [-7, 6, -4, 3, 0].map((toValue) => Animated.timing(x, { toValue, duration: 60, useNativeDriver: NATIVO })),
    ).start();
  }, [clave, x]);
  return x;
}

// Bucle de 0 a 1 que se repite (para las demos). `quieto`: dónde se queda con «Reducir movimiento».
export function useBucle(ms: number, quieto = 0.9, activo = true) {
  const [t] = useState(() => new Animated.Value(reducir ? quieto : 0));
  useEffect(() => {
    if (reducir || !activo) {
      if (reducir) t.setValue(quieto);
      return;
    }
    t.setValue(0);
    const a = Animated.loop(Animated.timing(t, { toValue: 1, duration: ms, easing: Easing.linear, useNativeDriver: NATIVO }));
    a.start();
    return () => a.stop();
  }, [t, ms, quieto, activo]);
  return t;
}

// Tramo de una animación, como los porcentajes de un @keyframes de CSS:
// tramo(t, [0, .3, .35, 1], [0, 0, 1, 1]) → aparece entre el 30 % y el 35 % del bucle.
export const tramo = (t: Animated.Value, puntos: number[], valores: number[]) =>
  t.interpolate({ inputRange: puntos, outputRange: valores, extrapolate: "clamp" });
