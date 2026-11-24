import * as Haptics from "expo-haptics";
import { useEffect, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SelectorModo } from "@/componentes/selector-modo";
import { color, fuente, margen, radio, sombra, type Peso } from "@/tema";
import { Logo } from "./marca";
import { Aparece, movimientoReducido, NATIVO, tramo, useAparecer, useBucle, usePresion, useSalto, useTemblor } from "./movimiento";

const PressableAnimado = Animated.createAnimatedComponent(Pressable);
const tocarSuave = () => {
  if (NATIVO) Haptics.selectionAsync().catch(() => {});
};

// Piezas de interfaz de ENRENTA: se usan en todas las pantallas para que la app se vea igual
// en todas partes (equivalen a las clases .btn, .card, .field, .tag… de la web).
// Todas tienen movimiento (ui/movimiento.tsx): aparecen, responden al tocar y saltan al cambiar.

// ---------------------------------------------------------------- Texto
type Variante = "titulo" | "subtitulo" | "cuerpo" | "fino" | "etiqueta";
const VARIANTES: Record<Variante, { size: number; peso: Peso; color: string; extra?: TextStyle }> = {
  titulo: { size: 28, peso: 600, color: color.tinta, extra: { letterSpacing: -0.6, lineHeight: 33 } },
  subtitulo: { size: 18, peso: 600, color: color.tinta, extra: { letterSpacing: -0.2, lineHeight: 23 } },
  cuerpo: { size: 15.5, peso: 400, color: color.tinta, extra: { lineHeight: 22 } },
  fino: { size: 13, peso: 400, color: color.suave, extra: { lineHeight: 18 } },
  etiqueta: { size: 11.5, peso: 600, color: color.suave, extra: { letterSpacing: 0.8, textTransform: "uppercase" } },
};

export function Texto({
  v = "cuerpo",
  peso,
  tono,
  style,
  ...resto
}: TextProps & { v?: Variante; peso?: Peso; tono?: string }) {
  const base = VARIANTES[v];
  return (
    <Text
      {...resto}
      style={[{ fontFamily: fuente[peso ?? base.peso], fontSize: base.size, color: tono ?? base.color }, base.extra, style]}
    />
  );
}

// ---------------------------------------------------------------- Botón
type TipoBoton = "primario" | "secundario" | "suave" | "whatsapp" | "peligro" | "enlace";
const BOTONES: Record<TipoBoton, { fondo: string; texto: string; borde?: string }> = {
  primario: { fondo: color.acento, texto: "#FFFFFF" },
  secundario: { fondo: color.superficie, texto: color.tinta, borde: color.lineaFuerte },
  suave: { fondo: color.acentoSuave, texto: color.acento },
  whatsapp: { fondo: color.whatsapp, texto: "#FFFFFF" },
  peligro: { fondo: color.superficie, texto: color.mal, borde: color.lineaFuerte },
  enlace: { fondo: "transparent", texto: color.acento },
};

export function Boton({
  titulo,
  onPress,
  tipo = "primario",
  chico = false,
  bloque = false,
  cargando = false,
  deshabilitado = false,
  icono,
  style,
}: {
  titulo: string;
  onPress?: () => void;
  tipo?: TipoBoton;
  chico?: boolean;
  bloque?: boolean;
  cargando?: boolean;
  deshabilitado?: boolean;
  icono?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const t = BOTONES[tipo];
  const apagado = deshabilitado || cargando;
  const { escala, onPressIn, onPressOut } = usePresion(tipo === "enlace" ? 0.94 : 0.96);
  // Al terminar de cargar (p. ej. «Guardando…» → listo), el botón da un pequeño salto.
  const salto = useSalto(cargando ? "cargando" : "listo", 0.92);
  const tocar = onPress
    ? () => {
        if (NATIVO && (tipo === "primario" || tipo === "whatsapp")) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }
    : undefined;
  return (
    <PressableAnimado
      accessibilityRole="button"
      accessibilityState={{ disabled: apagado, busy: cargando }}
      onPress={tocar}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={apagado}
      style={[
        estilos.boton,
        chico && estilos.botonChico,
        tipo === "enlace" && estilos.botonEnlace,
        { backgroundColor: t.fondo, opacity: apagado ? 0.5 : 1, transform: [{ scale: Animated.multiply(escala, salto) }] },
        t.borde ? { borderWidth: 1, borderColor: t.borde } : null,
        bloque ? { alignSelf: "stretch" } : { alignSelf: "flex-start" },
        style,
      ]}
    >
      {cargando ? <ActivityIndicator size="small" color={t.texto} /> : icono}
      <Text style={[estilos.botonTexto, chico && { fontSize: 14 }, { color: t.texto }]}>{titulo}</Text>
    </PressableAnimado>
  );
}

// ---------------------------------------------------------------- Tarjeta
// Aparece al mostrarse; si llegan varias juntas (una lista), entran en cascada.
export function Tarjeta({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <Aparece style={[estilos.tarjeta, style]}>{children}</Aparece>;
}

// ---------------------------------------------------------------- Campo de texto
export function Campo({
  etiqueta,
  ayuda,
  error,
  style,
  ...input
}: TextInputProps & { etiqueta: string; ayuda?: string; error?: string }) {
  // Al escribir, el campo se marca con el azul de la marca; si hay un error, tiembla.
  const [foco, setFoco] = useState(false);
  const x = useTemblor(error);
  return (
    <View style={[{ gap: 6 }, style as StyleProp<ViewStyle>]}>
      <Texto peso={500} style={{ fontSize: 14 }}>
        {etiqueta}
      </Texto>
      <Animated.View style={{ transform: [{ translateX: x }] }}>
        <TextInput
          placeholderTextColor="#9AA0AE"
          {...input}
          onFocus={(e) => {
            setFoco(true);
            input.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFoco(false);
            input.onBlur?.(e);
          }}
          style={[
            estilos.input,
            input.multiline && { minHeight: 88, textAlignVertical: "top", paddingTop: 12 },
            foco && estilos.inputFoco,
            error ? { borderColor: color.mal } : null,
          ]}
        />
      </Animated.View>
      {error ? (
        <Aparece retraso={0} desde="arriba">
          <Texto v="fino" tono={color.mal}>
            {error}
          </Texto>
        </Aparece>
      ) : ayuda ? (
        <Texto v="fino">{ayuda}</Texto>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------- Chip (filtro o elección)
export function Chip({
  texto,
  activo = false,
  onPress,
  icono,
}: {
  texto: string;
  activo?: boolean;
  onPress?: () => void;
  icono?: ReactNode;
}) {
  const { escala, onPressIn, onPressOut } = usePresion(0.94);
  const salto = useSalto(activo, 0.88);
  return (
    <PressableAnimado
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
      onPress={
        onPress
          ? () => {
              tocarSuave();
              onPress();
            }
          : undefined
      }
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[estilos.chip, activo && estilos.chipActivo, { transform: [{ scale: Animated.multiply(escala, salto) }] }]}
    >
      {icono}
      <Text style={[estilos.chipTexto, activo && { color: color.acento }]}>{texto}</Text>
    </PressableAnimado>
  );
}

// ---------------------------------------------------------------- Etiqueta de estado
export type Tono = "" | "ok" | "aviso" | "acento" | "mal";
const TONOS: Record<Tono, { fondo: string; texto: string }> = {
  "": { fondo: color.superficie2, texto: color.suave },
  ok: { fondo: color.okSuave, texto: color.ok },
  aviso: { fondo: color.avisoSuave, texto: color.aviso },
  acento: { fondo: color.acentoSuave, texto: color.acento },
  mal: { fondo: color.malSuave, texto: color.mal },
};

export function Etiqueta({ texto, tono = "" }: { texto: string; tono?: Tono }) {
  const t = TONOS[tono];
  // Cuando cambia el estado («Enviada» → «Rentada»), la etiqueta da un salto.
  const salto = useSalto(texto);
  return (
    <Animated.View style={[estilos.etiqueta, { backgroundColor: t.fondo, transform: [{ scale: salto }] }]}>
      <Text style={[estilos.etiquetaTexto, { color: t.texto }]}>{texto}</Text>
    </Animated.View>
  );
}

// ---------------------------------------------------------------- Aviso (mensaje en una caja)
export function Aviso({ texto, tono = "acento", children }: { texto?: string; tono?: Tono; children?: ReactNode }) {
  const t = TONOS[tono];
  // Aparece al mostrarse; los errores, además, tiemblan.
  const v = useAparecer(0, 380);
  const x = useTemblor(tono === "mal" ? texto || "error" : "");
  return (
    <Animated.View
      style={[
        estilos.aviso,
        {
          backgroundColor: t.fondo,
          opacity: v,
          transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) }, { translateX: x }],
        },
      ]}
      accessibilityRole={tono === "mal" ? "alert" : undefined}
    >
      {texto ? <Text style={[estilos.avisoTexto, { color: tono === "" ? color.tinta : t.texto }]}>{texto}</Text> : null}
      {children}
    </Animated.View>
  );
}

// ---------------------------------------------------------------- Cantidad (− n +)
export function Cantidad({
  valor,
  onCambio,
  min = 0,
  max = 999,
  nombre,
}: {
  valor: number;
  onCambio: (n: number) => void;
  min?: number;
  max?: number;
  nombre: string;
}) {
  // El número salta cada vez que cambia; los botones se hunden al tocarlos.
  const salto = useSalto(valor, 0.7);
  const menos = usePresion(0.86);
  const mas = usePresion(0.86);
  const cambiar = (n: number) => {
    tocarSuave();
    onCambio(n);
  };
  return (
    <View style={estilos.cantidad} accessibilityLabel={`Cantidad de ${nombre}`}>
      <PressableAnimado
        accessibilityRole="button"
        accessibilityLabel="Uno menos"
        disabled={valor <= min}
        onPress={() => cambiar(Math.max(min, valor - 1))}
        onPressIn={menos.onPressIn}
        onPressOut={menos.onPressOut}
        style={[estilos.cantBtn, valor <= min && { opacity: 0.35 }, { transform: [{ scale: menos.escala }] }]}
        hitSlop={6}
      >
        <Text style={estilos.cantSigno}>−</Text>
      </PressableAnimado>
      <Animated.Text style={[estilos.cantValor, { transform: [{ scale: salto }] }]}>{valor}</Animated.Text>
      <PressableAnimado
        accessibilityRole="button"
        accessibilityLabel="Uno más"
        disabled={valor >= max}
        onPress={() => cambiar(Math.min(max, valor + 1))}
        onPressIn={mas.onPressIn}
        onPressOut={mas.onPressOut}
        style={[estilos.cantBtn, valor >= max && { opacity: 0.35 }, { transform: [{ scale: mas.escala }] }]}
        hitSlop={6}
      >
        <Text style={estilos.cantSigno}>+</Text>
      </PressableAnimado>
    </View>
  );
}

// ---------------------------------------------------------------- Pantalla con desplazamiento
// Respeta la muesca del iPhone y deja espacio para la barra de pestañas. En las pestañas lleva
// una barra fija arriba: el logo a la izquierda y el interruptor Necesito | Tengo a la derecha.
export function Pantalla({
  children,
  refrescando,
  onRefrescar,
  conPestanas = true,
  fijo,
  lleno = false,
  style,
}: {
  children: ReactNode;
  refrescando?: boolean;
  onRefrescar?: () => void;
  conPestanas?: boolean;
  fijo?: ReactNode; // algo que queda fijo arriba mientras el resto se desplaza (p. ej. Atrás / Continuar)
  lleno?: boolean; // el contenido ocupa todo el espacio y se desplaza solo (p. ej. un mapa o una lista propia)
  style?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  const web = Platform.OS === "web";
  // La pantalla entra con un fundido; sus tarjetas, en cascada.
  const entrada = useAparecer(0, 360);
  return (
    <View style={{ flex: 1, backgroundColor: color.fondo }}>
      {conPestanas ? (
        // En la web (solo para revisar en el computador) las pestañas van arriba.
        <View style={[estilos.barraSuperior, { paddingTop: insets.top + (web ? 66 : 6) }]}>
          <Logo alto={18} />
          <SelectorModo />
        </View>
      ) : null}
      {fijo ? <View style={estilos.fijo}>{fijo}</View> : null}
      {lleno ? <Animated.View style={[{ flex: 1, opacity: entrada }, style]}>{children}</Animated.View> : null}
      {lleno ? null : (
      <Animated.ScrollView
        style={{ flex: 1, opacity: entrada }}
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[
          {
            paddingHorizontal: margen,
            paddingTop: conPestanas ? 10 : insets.top + 12,
            paddingBottom: insets.bottom + (conPestanas ? 96 : 32),
            gap: 16,
          },
          style,
        ]}
        refreshControl={
          onRefrescar ? (
            <RefreshControl refreshing={refrescando ?? false} onRefresh={onRefrescar} tintColor={color.acento} />
          ) : undefined
        }
      >
        {children}
      </Animated.ScrollView>
      )}
    </View>
  );
}

// Título grande de una pantalla, con texto de apoyo y una acción a la derecha.
export function Encabezado({ titulo, sub, derecha }: { titulo: string; sub?: string; derecha?: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
      <Aparece retraso={0} desde="izquierda" style={{ flex: 1, gap: 6 }}>
        <Texto v="titulo">{titulo}</Texto>
        {sub ? <Texto v="fino" style={{ fontSize: 14.5, lineHeight: 20 }}>{sub}</Texto> : null}
      </Aparece>
      {derecha}
    </View>
  );
}

// Fila con etiqueta y valor (detalles de una cotización).
export function Fila({ izq, der, fuerte = false }: { izq: string; der: string; fuerte?: boolean }) {
  return (
    <View style={estilos.fila}>
      <Texto v={fuerte ? "cuerpo" : "fino"} peso={fuerte ? 600 : 400} style={{ flex: 1 }}>
        {izq}
      </Texto>
      <Texto peso={fuerte ? 700 : 500} style={{ fontSize: fuerte ? 16 : 14 }}>
        {der}
      </Texto>
    </View>
  );
}

// Interruptor de dos o más opciones (como el .seg de la web).
export function Segmentos<T extends string>({
  opciones,
  valor,
  onCambio,
}: {
  opciones: { id: T; texto: string; deshabilitado?: boolean }[];
  valor: T;
  onCambio: (v: T) => void;
}) {
  // La pastilla blanca se desliza hasta la opción elegida.
  const [ancho, setAncho] = useState(0);
  const i = Math.max(0, opciones.findIndex((o) => o.id === valor));
  const n = opciones.length;
  const pos = useDeslizar(i);
  const w = ancho ? (ancho - 6 - 2 * (n - 1)) / n : 0;
  return (
    <View style={estilos.seg} accessibilityRole="radiogroup" onLayout={(e) => setAncho(e.nativeEvent.layout.width)}>
      {w > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            estilos.segPastilla,
            { width: w, transform: [{ translateX: pos.interpolate({ inputRange: [0, Math.max(1, n - 1)], outputRange: [0, Math.max(1, n - 1) * (w + 2)] }) }] },
          ]}
        />
      ) : null}
      {opciones.map((o) => {
        const activo = o.id === valor;
        return (
          <Pressable
            key={o.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: activo, disabled: o.deshabilitado }}
            disabled={o.deshabilitado}
            onPress={() => {
              if (!activo) tocarSuave();
              onCambio(o.id);
            }}
            style={[estilos.segItem, activo && !w && estilos.segActivo, o.deshabilitado && { opacity: 0.4 }]}
          >
            <Text style={[estilos.segTexto, activo && { color: color.tinta }]} numberOfLines={1}>
              {o.texto}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Tres puntos con los colores del cable de la marca que saltan uno tras otro.
export function Cargando({ texto = "Cargando…" }: { texto?: string }) {
  const t = useBucle(1100, 0);
  return (
    <View style={{ paddingVertical: 40, alignItems: "center", gap: 14 }} accessibilityRole="progressbar" accessibilityLabel={texto}>
      <View style={{ flexDirection: "row", gap: 7 }}>
        {[color.acento, "#A08BF6", color.coral].map((c, k) => (
          <Animated.View
            key={c}
            style={[
              estilos.punto,
              {
                backgroundColor: c,
                transform: [{ translateY: tramo(t, [0, 0.1 + k * 0.12, 0.25 + k * 0.12, 0.4 + k * 0.12, 1], [0, 0, -8, 0, 0]) }],
              },
            ]}
          />
        ))}
      </View>
      <Texto v="fino">{texto}</Texto>
    </View>
  );
}

// Posición animada (con resorte) de la opción elegida en Segmentos.
function useDeslizar(i: number) {
  const [pos] = useState(() => new Animated.Value(i));
  useEffect(() => {
    if (movimientoReducido()) pos.setValue(i);
    else Animated.spring(pos, { toValue: i, useNativeDriver: NATIVO, damping: 18, stiffness: 220, mass: 0.8 }).start();
  }, [i, pos]);
  return pos;
}

export const estilos = StyleSheet.create({
  fijo: {
    paddingHorizontal: margen,
    paddingTop: 4,
    paddingBottom: 12,
    backgroundColor: color.fondo,
    borderBottomWidth: 1,
    borderBottomColor: color.linea,
  },
  barraSuperior: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: margen,
    paddingBottom: 8,
    backgroundColor: color.fondo,
  },
  boton: {
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: radio.pildora,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  botonChico: { minHeight: 38, paddingHorizontal: 14 },
  botonEnlace: { paddingHorizontal: 4, minHeight: 36 },
  botonTexto: { fontFamily: fuente[600], fontSize: 15.5 },
  tarjeta: { backgroundColor: color.superficie, borderRadius: radio.lg, padding: 16, gap: 12, ...sombra },
  input: {
    minHeight: 48,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: color.lineaFuerte,
    backgroundColor: color.superficie,
    paddingHorizontal: 14,
    fontFamily: fuente[400],
    fontSize: 16,
    color: color.tinta,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    minHeight: 38,
    borderRadius: radio.pildora,
    backgroundColor: color.superficie,
    borderWidth: 1,
    borderColor: color.linea,
  },
  chipActivo: { backgroundColor: color.acentoSuave, borderColor: "rgba(59,91,219,0.45)" },
  chipTexto: { fontFamily: fuente[500], fontSize: 14, color: color.tinta },
  etiqueta: { alignSelf: "flex-start", paddingHorizontal: 9, paddingVertical: 4, borderRadius: radio.pildora },
  etiquetaTexto: { fontFamily: fuente[600], fontSize: 12 },
  aviso: { borderRadius: radio.md, padding: 14, gap: 8 },
  avisoTexto: { fontFamily: fuente[500], fontSize: 14, lineHeight: 20 },
  cantidad: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: color.superficie2,
    borderRadius: radio.pildora,
    padding: 3,
  },
  cantBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: color.superficie },
  cantSigno: { fontFamily: fuente[600], fontSize: 18, color: color.acento, marginTop: -1 },
  cantValor: { fontFamily: fuente[600], fontSize: 15, minWidth: 30, textAlign: "center", color: color.tinta },
  fila: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
  seg: { flexDirection: "row", backgroundColor: color.superficie2, borderRadius: radio.pildora, padding: 3, gap: 2 },
  segItem: { flex: 1, minHeight: 38, borderRadius: radio.pildora, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  segActivo: { backgroundColor: color.superficie, ...sombra, shadowOpacity: 0.12 },
  segPastilla: { position: "absolute", top: 3, bottom: 3, left: 3, borderRadius: radio.pildora, backgroundColor: color.superficie, ...sombra, shadowOpacity: 0.12 },
  inputFoco: { borderColor: color.acento, borderWidth: 1.5 },
  punto: { width: 9, height: 9, borderRadius: 5 },
  segTexto: { fontFamily: fuente[500], fontSize: 14, color: color.suave },
});
