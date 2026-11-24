import { useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { color } from "@/tema";

// Dibujos de fondo (degradados, puntos, luces) que siempre miden lo mismo que su panel.
// En el iPhone, un <Svg width="100%" height="100%"> se queda con el tamaño que tenía al dibujarse:
// si después el panel crece (el texto se acomoda, carga la fuente, aparece otra fila), el fondo
// queda corto y se ve el panel «cortado». Aquí se mide el panel con onLayout y el dibujo se
// rehace con el tamaño exacto cada vez que cambia.
export function Fondo({
  children,
  viewBox,
  preserveAspectRatio,
}: {
  children: (ancho: number, alto: number) => ReactNode;
  viewBox?: string; // para dibujos con coordenadas propias (el mapa de ejemplo)
  preserveAspectRatio?: string;
}) {
  const [t, setT] = useState({ w: 0, h: 0 });
  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setT((p) => (Math.abs(p.w - width) < 0.5 && Math.abs(p.h - height) < 0.5 ? p : { w: width, h: height }));
      }}
    >
      {t.w > 0 && t.h > 0 ? (
        <Svg width={t.w} height={t.h} viewBox={viewBox} preserveAspectRatio={preserveAspectRatio}>
          {children(t.w, t.h)}
        </Svg>
      ) : null}
    </View>
  );
}

// El cable de la marca (azul → lavanda → coral) como línea fina, del ancho de su contenedor.
// Se pone dentro de una View con alto fijo y position absolute.
export function Cable({ alto = 4 }: { alto?: number }) {
  return (
    <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: alto }} pointerEvents="none">
      <Fondo>
        {(w, h) => (
          <>
            <Defs>
              <LinearGradient id="cableMarca" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={color.acento} />
                <Stop offset="0.55" stopColor="#A08BF6" />
                <Stop offset="1" stopColor={color.coral} />
              </LinearGradient>
            </Defs>
            <Rect width={w} height={h} fill="url(#cableMarca)" />
          </>
        )}
      </Fondo>
    </View>
  );
}
