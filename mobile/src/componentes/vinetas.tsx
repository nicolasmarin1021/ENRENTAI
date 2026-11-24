import { useState, type ReactNode } from "react";
import { Animated, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Defs, Line, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { Fondo } from "@/ui/fondo";
import { Icono } from "@/ui/iconos";
import { tramo, useBucle } from "@/ui/movimiento";
import { color, fuente, radio } from "@/tema";

// Viñetas animadas de lo que trae ENRENTA completa (anuncio «Lo que viene»), las mismas de la web
// (web/src/components/novedades-vistas.tsx). Cada una repite en bucle lo que hará esa novedad.
// Datos de ejemplo.

const CICLO = 6500;
const CANDADO = "M6 11h12v9H6z";
const ARCO_CERRADO = "M8.5 11V8a3.5 3.5 0 0 1 7 0v3";
const ARCO_ABIERTO = "M8.5 9V6a3.5 3.5 0 0 1 7 0";
const CAMPANA = "M6.5 16v-5a5.5 5.5 0 0 1 11 0v5l1.5 2h-14zM10 20.5a2 2 0 0 0 4 0";
const AUDIFONOS = "M4.5 13a7.5 7.5 0 0 1 15 0M4.5 13v3.5A1.5 1.5 0 0 0 6 18h1.5v-5.5H6M19.5 13v3.5A1.5 1.5 0 0 1 18 18h-1.5v-5.5H18";
const PARLANTE = "M7 4h10v16H7zM12 16a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2zM12 7.6h.01";
const BAJA = "M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14";

function Trazo({ d, tam = 16, tinta = color.tinta, grosor = 1.9 }: { d: string; tam?: number; tinta?: string; grosor?: number }) {
  return (
    <Svg viewBox="0 0 24 24" width={tam} height={tam} fill="none" stroke={tinta} strokeWidth={grosor} strokeLinecap="round" strokeLinejoin="round">
      <Path d={d} />
    </Svg>
  );
}

// Tres estados seguidos en el mismo sitio: el 1.º hasta ~30 %, el 2.º hasta ~63 %, el 3.º hasta el final.
function useTresEstados(t: Animated.Value) {
  return [
    tramo(t, [0, 0.29, 0.33, 1], [1, 1, 0, 0]),
    tramo(t, [0, 0.3, 0.34, 0.62, 0.66, 1], [0, 0, 1, 1, 0, 0]),
    tramo(t, [0, 0.63, 0.67, 0.95, 1], [0, 0, 1, 1, 0]),
  ];
}

function Pildora({ texto, fondo, tinta, icono, style }: { texto: string; fondo: string; tinta: string; icono?: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[e.pildora, { backgroundColor: fondo }, style]}>
      {icono}
      <Text style={[e.pildoraTexto, { color: tinta }]}>{texto}</Text>
    </View>
  );
}

function Caja({ children, onAncho, style }: { children: ReactNode; onAncho?: (w: number) => void; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[e.vista, style]} onLayout={onAncho ? (ev) => onAncho(ev.nativeEvent.layout.width) : undefined} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {children}
    </View>
  );
}

// ---- Pago protegido: el pago sale de ti, ENRENTA lo guarda y se libera a la compañía.
function VistaPago() {
  const t = useBucle(CICLO, 0.45);
  const [w, setW] = useState(0);
  const [e1, e2, e3] = useTresEstados(t);
  const dentro = w - 24; // ancho útil (padding 12 a cada lado)
  const xs = [22, dentro / 2, dentro - 39].map((x) => x - 9);
  const p = [0, 0.06, 0.28, 0.31, 0.6, 0.63, 0.86, 0.92, 1];
  return (
    <Caja onAncho={setW}>
      {w > 0 ? (
        <Svg width={w} height={44} style={StyleSheet.absoluteFill}>
          <Line x1={22 + 12} y1={31} x2={w - 39 - 12} y2={31} stroke={color.lineaFuerte} strokeWidth={1.5} strokeDasharray="4 4" />
        </Svg>
      ) : null}
      <View style={e.filaNodos}>
        <Pildora texto="Tú" fondo={color.superficie2} tinta={color.tinta} style={{ width: 44, justifyContent: "center" }} />
        <Animated.View style={[e.boveda, { transform: [{ scale: tramo(t, [0, 0.26, 0.31, 0.38, 0.58, 0.63, 0.7, 1], [1, 1, 1.14, 1, 1, 1.08, 1, 1]) }] }]}>
          <Icono n="escudo" tam={20} tinta="#FFFFFF" grosor={1.9} />
        </Animated.View>
        <Pildora texto="Compañía" fondo={color.superficie2} tinta={color.tinta} style={{ width: 78, justifyContent: "center" }} />
      </View>
      {w > 0 ? (
        <Animated.View
          style={[
            e.moneda,
            { opacity: tramo(t, p, [0, 1, 1, 0, 0, 1, 1, 0, 0]), transform: [{ translateX: tramo(t, p, [xs[0], xs[0], xs[1], xs[1], xs[1], xs[1], xs[2], xs[2], xs[2]]) }] },
          ]}
        >
          <Text style={e.monedaTexto}>$</Text>
        </Animated.View>
      ) : null}
      <View style={e.capasAbajo}>
        <Animated.View style={[e.capa, { opacity: e1 }]}>
          <Pildora texto="Pagas en ENRENTA" fondo="#FFEDE7" tinta="#C4502F" />
        </Animated.View>
        <Animated.View style={[e.capa, { opacity: e2 }]}>
          <Pildora texto="Protegido" fondo={color.acentoSuave} tinta={color.acento} />
        </Animated.View>
        <Animated.View style={[e.capa, { opacity: e3 }]}>
          <Pildora texto="Liberado ✓" fondo={color.okSuave} tinta={color.ok} />
        </Animated.View>
      </View>
    </Caja>
  );
}

// ---- Depósito en garantía: guardado durante la renta y devuelto al cerrar.
function VistaDeposito() {
  const t = useBucle(CICLO, 0.8);
  const cerrado = tramo(t, [0, 0.6, 0.64, 0.97, 1], [1, 1, 0, 0, 1]);
  const abierto = tramo(t, [0, 0.6, 0.64, 0.97, 1], [0, 0, 1, 1, 0]);
  return (
    <Caja>
      <View style={e.depFila}>
        <View style={e.candado}>
          <Animated.View style={[StyleSheet.absoluteFill, e.centro, { opacity: cerrado }]}>
            <Trazo d={`${CANDADO}${ARCO_CERRADO}`} tinta={color.acento} />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, e.centro, { opacity: abierto }]}>
            <Trazo d={`${CANDADO}${ARCO_ABIERTO}`} tinta={color.ok} />
          </Animated.View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={e.negrita}>Depósito</Text>
          <Text style={e.fino}>$ 500.000</Text>
        </View>
        <View style={[e.capas, { alignItems: "flex-end", width: 92 }]}>
          <Animated.View style={[e.capa, { opacity: tramo(t, [0, 0.6, 0.64, 1], [1, 1, 0, 0]) }]}>
            <Pildora texto="Guardado" fondo={color.acentoSuave} tinta={color.acento} />
          </Animated.View>
          <Animated.View
            style={[
              e.capa,
              { opacity: tramo(t, [0, 0.61, 0.66, 0.95, 1], [0, 0, 1, 1, 0]), transform: [{ scale: tramo(t, [0, 0.61, 0.66, 1], [0.7, 0.7, 1, 1]) }] },
            ]}
          >
            <Pildora texto="Devuelto ✓" fondo={color.okSuave} tinta={color.ok} />
          </Animated.View>
        </View>
      </View>
      <View style={e.renta}>
        <Text style={e.mini}>sáb 13</Text>
        <View style={e.rentaBarra}>
          <Animated.View style={[e.rentaLlena, { transform: [{ scaleX: tramo(t, [0, 0.06, 0.6, 1], [0, 0, 1, 1]) }] }]} />
        </View>
        <Text style={e.mini}>dom 14</Text>
      </View>
      <Animated.Text
        style={[
          e.mas,
          {
            opacity: tramo(t, [0, 0.63, 0.69, 0.86, 0.94, 1], [0, 0, 1, 1, 0, 0]),
            transform: [{ translateY: tramo(t, [0, 0.63, 0.69, 0.86, 0.94, 1], [8, 8, 0, -2, -4, -4]) }],
          },
        ]}
      >
        + $ 500.000
      </Animated.Text>
    </Caja>
  );
}

// ---- Entregas con fotos: cada paso queda con su foto y su chequeo.
function VistaFotos() {
  const t = useBucle(CICLO, 0.8);
  return (
    <Caja style={e.fotos}>
      {["Salida", "Llegada", "Regreso", "Revisión"].map((paso, i) => {
        const a = 0.04 + i * 0.12;
        return (
          <View key={paso} style={e.foto}>
            <Animated.View
              style={[
                e.img,
                { opacity: tramo(t, [0, a, a + 0.04, 0.88, 0.94, 1], [0, 0, 1, 1, 0, 0]), transform: [{ scale: tramo(t, [0, a, a + 0.04, 1], [0.85, 0.85, 1, 1]) }] },
              ]}
            >
              <Trazo d={PARLANTE} tam={18} tinta="#4A5072" grosor={1.6} />
              <Animated.View style={[e.flash, { opacity: tramo(t, [0, a, a + 0.02, a + 0.09, 1], [0, 0, 0.95, 0, 0]) }]} />
              <Animated.View
                style={[
                  e.okFoto,
                  {
                    opacity: tramo(t, [0, a + 0.05, a + 0.09, 0.88, 0.94, 1], [0, 0, 1, 1, 0, 0]),
                    transform: [{ scale: tramo(t, [0, a + 0.05, a + 0.09, a + 0.12, 1], [0.4, 0.4, 1.18, 1, 1]) }],
                  },
                ]}
              >
                <Icono n="check" tam={9} tinta="#FFFFFF" grosor={3.4} />
              </Animated.View>
            </Animated.View>
            <Text style={e.mini}>{paso}</Text>
          </View>
        );
      })}
    </Caja>
  );
}

// ---- Casos con respaldo: el caso pasa de abierto a resuelto, con fotos y ENRENTA en medio.
function VistaCaso() {
  const t = useBucle(CICLO, 0.8);
  const [e1, e2, e3] = useTresEstados(t);
  const aparece = (a: number) => ({
    opacity: tramo(t, [0, a, a + 0.05, 0.94, 1], [0, 0, 1, 1, 0]),
    transform: [{ scale: tramo(t, [0, a, a + 0.05, 1], [0.6, 0.6, 1, 1]) }],
  });
  return (
    <Caja>
      <View style={e.casoCab}>
        <Text style={e.negrita}>Caso · Faltante</Text>
        <View style={[e.capas, { alignItems: "flex-end", width: 104 }]}>
          <Animated.View style={[e.capa, { opacity: e1 }]}>
            <Pildora texto="Abierto" fondo={color.malSuave} tinta={color.mal} />
          </Animated.View>
          <Animated.View style={[e.capa, { opacity: e2 }]}>
            <Pildora texto="En revisión" fondo={color.avisoSuave} tinta={color.aviso} />
          </Animated.View>
          <Animated.View style={[e.capa, { opacity: e3 }]}>
            <Pildora texto="Resuelto ✓" fondo={color.okSuave} tinta={color.ok} />
          </Animated.View>
        </View>
      </View>
      <View style={e.casoFila}>
        <Animated.View style={aparece(0.07)}>
          <Pildora texto="3 fotos" fondo={color.superficie2} tinta={color.tinta} icono={<Icono n="camara" tam={12} tinta={color.tinta} grosor={2} />} />
        </Animated.View>
        <Animated.View style={aparece(0.33)}>
          <Pildora texto="ENRENTA media" fondo={color.tinta} tinta="#FFFFFF" icono={<Trazo d={AUDIFONOS} tam={12} tinta="#FFFFFF" grosor={2} />} />
        </Animated.View>
      </View>
      <View style={e.casoBarra}>
        <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: "left", transform: [{ scaleX: tramo(t, [0, 0.66, 1], [0.06, 1, 1]) }] }]}>
          <Fondo>
            {(w, h) => (
              <>
                <Defs>
                  <LinearGradient id="caso" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0" stopColor={color.mal} />
                    <Stop offset="0.5" stopColor={color.aviso} />
                    <Stop offset="1" stopColor={color.ok} />
                  </LinearGradient>
                </Defs>
                <Rect width={w} height={h} rx={2} fill="url(#caso)" />
              </>
            )}
          </Fondo>
        </Animated.View>
      </View>
    </Caja>
  );
}

// ---- Chat en ENRENTA: avisos automáticos de cada paso y la conversación con la compañía.
function VistaChat() {
  const t = useBucle(CICLO, 0.8);
  const llega = (a: number) => ({
    opacity: tramo(t, [0, a, a + 0.05, 0.92, 0.98, 1], [0, 0, 1, 1, 0, 0]),
    transform: [{ translateY: tramo(t, [0, a, a + 0.05, 1], [6, 6, 0, 0]) }],
  });
  return (
    <Caja style={{ gap: 5, paddingTop: 9 }}>
      <Animated.View style={[{ alignSelf: "flex-start" }, llega(0.04)]}>
        <Pildora texto="Tu equipo salió de bodega" fondo={color.avisoSuave} tinta={color.aviso} icono={<Trazo d={CAMPANA} tam={11} tinta={color.aviso} grosor={2} />} />
      </Animated.View>
      <Animated.View style={[e.msgCia, llega(0.28)]}>
        <Text style={e.msgTexto}>Llegamos a las 3:00 p. m.</Text>
      </Animated.View>
      <Animated.View style={[e.msgTu, llega(0.54)]}>
        <Text style={[e.msgTexto, { color: "#FFFFFF" }]}>¡Perfecto, gracias!</Text>
      </Animated.View>
    </Caja>
  );
}

// ---- Comprobantes y liquidaciones: el documento se arma y sale en PDF.
function VistaPdf() {
  const t = useBucle(CICLO, 0.8);
  const b = useBucle(1000, 0);
  return (
    <Caja style={e.pdf}>
      <View style={e.hojas}>
        <View style={[e.hoja, e.hojaAtras]} />
        <Animated.View style={[e.hoja, { transform: [{ translateY: tramo(t, [0, 0.12, 1], [56, 0, 0]) }] }]}>
          <View style={e.hojaLogo} />
          {[0, 1, 2].map((k) => (
            <Animated.View
              key={k}
              style={[e.lin, k === 1 && { width: "80%" }, { transformOrigin: "left", transform: [{ scaleX: tramo(t, [0, 0.14 + k * 0.03, 0.22 + k * 0.03, 1], [0, 0, 1, 1]) }] }]}
            />
          ))}
          <Animated.View style={[e.lin, e.linTotal, { transformOrigin: "left", transform: [{ scaleX: tramo(t, [0, 0.25, 0.33, 1], [0, 0, 1, 1]) }] }]} />
          <Animated.View
            style={[
              e.sello,
              { opacity: tramo(t, [0, 0.46, 0.52, 0.94, 1], [0, 0, 1, 1, 0]), transform: [{ rotate: "-8deg" }, { scale: tramo(t, [0, 0.46, 0.52, 1], [1.9, 1.9, 1, 1]) }] },
            ]}
          >
            <Text style={e.selloTexto}>PDF</Text>
          </Animated.View>
        </Animated.View>
      </View>
      <Animated.View
        style={[e.descarga, { opacity: tramo(t, [0, 0.56, 0.62, 0.94, 1], [0, 0, 1, 1, 0]), transform: [{ scale: tramo(t, [0, 0.56, 0.62, 1], [0.5, 0.5, 1, 1]) }] }]}
      >
        <Animated.View style={{ transform: [{ translateY: tramo(b, [0, 0.5, 1], [0, 2.5, 0]) }] }}>
          <Trazo d={BAJA} tam={15} tinta="#FFFFFF" grosor={2.2} />
        </Animated.View>
      </Animated.View>
    </Caja>
  );
}

// Por título de la novedad (lib/novedades.ts).
export const VINETAS: Record<string, () => ReactNode> = {
  "Pago protegido": VistaPago,
  "Depósito en garantía": VistaDeposito,
  "Entregas con fotos": VistaFotos,
  "Casos con respaldo": VistaCaso,
  "Chat en ENRENTA": VistaChat,
  "Comprobantes y liquidaciones": VistaPdf,
};

const e = StyleSheet.create({
  vista: {
    height: 92,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: color.superficie,
    borderWidth: 1,
    borderColor: color.linea,
    overflow: "hidden",
  },
  centro: { alignItems: "center", justifyContent: "center" },
  pildora: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radio.pildora },
  pildoraTexto: { fontFamily: fuente[600], fontSize: 10.5 },
  capas: { height: 24, alignItems: "center", justifyContent: "center" },
  capa: { position: "absolute" },
  capasAbajo: { position: "absolute", left: 0, right: 0, bottom: 10, height: 24, alignItems: "center", justifyContent: "center" },
  negrita: { fontFamily: fuente[600], fontSize: 12, color: color.tinta },
  fino: { fontFamily: fuente[400], fontSize: 10.5, color: color.suave },
  mini: { fontFamily: fuente[400], fontSize: 9.5, color: color.suave },
  // pago
  filaNodos: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 },
  boveda: { width: 38, height: 38, borderRadius: 12, backgroundColor: color.acento, alignItems: "center", justifyContent: "center" },
  moneda: {
    position: "absolute",
    top: 22,
    left: 12,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: color.coral,
    alignItems: "center",
    justifyContent: "center",
  },
  monedaTexto: { fontFamily: fuente[700], fontSize: 10, color: "#FFFFFF" },
  // depósito
  depFila: { flexDirection: "row", alignItems: "center", gap: 8 },
  candado: { width: 30, height: 30, borderRadius: 10, backgroundColor: color.acentoSuave },
  renta: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 18 },
  rentaBarra: { flex: 1, height: 5, borderRadius: 3, backgroundColor: color.superficie2, overflow: "hidden" },
  rentaLlena: { flex: 1, backgroundColor: color.acento, transformOrigin: "left" },
  mas: { position: "absolute", left: 12, top: 43, fontFamily: fuente[700], fontSize: 11, color: color.ok },
  // fotos
  fotos: { flexDirection: "row", gap: 8, paddingTop: 12 },
  foto: { flex: 1, alignItems: "center", gap: 5 },
  img: { width: "100%", maxWidth: 50, aspectRatio: 1, borderRadius: 10, backgroundColor: "#D9E0F7", alignItems: "center", justifyContent: "center" },
  flash: { ...StyleSheet.absoluteFill, borderRadius: 10, backgroundColor: "#FFFFFF" },
  okFoto: {
    position: "absolute",
    right: -5,
    top: -5,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: color.ok,
    borderWidth: 2,
    borderColor: color.superficie,
    alignItems: "center",
    justifyContent: "center",
  },
  // caso
  casoCab: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  casoFila: { flexDirection: "row", gap: 5, marginTop: 8 },
  casoBarra: { position: "absolute", left: 12, right: 12, bottom: 11, height: 4, borderRadius: 2, backgroundColor: color.superficie2, overflow: "hidden" },
  // chat
  msgCia: { alignSelf: "flex-start", maxWidth: "85%", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 11, borderBottomLeftRadius: 3, backgroundColor: color.superficie2 },
  msgTu: { alignSelf: "flex-end", maxWidth: "85%", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 11, borderBottomRightRadius: 3, backgroundColor: color.acento },
  msgTexto: { fontFamily: fuente[400], fontSize: 10.5, color: color.tinta },
  // pdf
  pdf: { flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 18, paddingBottom: 0 },
  hojas: { width: 66, height: 72 },
  hoja: {
    ...StyleSheet.absoluteFill,
    gap: 6,
    paddingHorizontal: 9,
    paddingTop: 9,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: color.lineaFuerte,
  },
  hojaAtras: { backgroundColor: color.superficie2, transform: [{ rotate: "-9deg" }, { translateX: -16 }, { translateY: 6 }] },
  hojaLogo: { width: 18, height: 6, borderRadius: 3, backgroundColor: color.acento, marginBottom: 2 },
  lin: { height: 4, borderRadius: 2, backgroundColor: color.lineaFuerte },
  linTotal: { width: "55%", alignSelf: "flex-end", backgroundColor: color.coral },
  sello: { position: "absolute", right: -12, top: 28, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, backgroundColor: color.coral },
  selloTexto: { fontFamily: fuente[700], fontSize: 9.5, letterSpacing: 0.6, color: "#FFFFFF" },
  descarga: { width: 32, height: 32, marginBottom: 16, borderRadius: 16, backgroundColor: color.acento, alignItems: "center", justifyContent: "center" },
});
