import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
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
import { color, fuente, margen, radio, sombra, type Peso } from "@/tema";

// Piezas de interfaz de ENRENTA: se usan en todas las pantallas para que la app se vea igual
// en todas partes (equivalen a las clases .btn, .card, .field, .tag… de la web).

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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: apagado, busy: cargando }}
      onPress={onPress}
      disabled={apagado}
      style={({ pressed }) => [
        estilos.boton,
        chico && estilos.botonChico,
        tipo === "enlace" && estilos.botonEnlace,
        { backgroundColor: t.fondo, opacity: apagado ? 0.5 : pressed ? 0.82 : 1 },
        t.borde ? { borderWidth: 1, borderColor: t.borde } : null,
        bloque ? { alignSelf: "stretch" } : { alignSelf: "flex-start" },
        style,
      ]}
    >
      {cargando ? <ActivityIndicator size="small" color={t.texto} /> : icono}
      <Text style={[estilos.botonTexto, chico && { fontSize: 14 }, { color: t.texto }]}>{titulo}</Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------- Tarjeta
export function Tarjeta({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[estilos.tarjeta, style]}>{children}</View>;
}

// ---------------------------------------------------------------- Campo de texto
export function Campo({
  etiqueta,
  ayuda,
  error,
  style,
  ...input
}: TextInputProps & { etiqueta: string; ayuda?: string; error?: string }) {
  return (
    <View style={[{ gap: 6 }, style as StyleProp<ViewStyle>]}>
      <Texto peso={500} style={{ fontSize: 14 }}>
        {etiqueta}
      </Texto>
      <TextInput
        placeholderTextColor="#9AA0AE"
        {...input}
        style={[estilos.input, input.multiline && { minHeight: 88, textAlignVertical: "top", paddingTop: 12 }, error ? { borderColor: color.mal } : null]}
      />
      {error ? (
        <Texto v="fino" tono={color.mal}>
          {error}
        </Texto>
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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
      onPress={onPress}
      style={({ pressed }) => [estilos.chip, activo && estilos.chipActivo, pressed && { opacity: 0.8 }]}
    >
      {icono}
      <Text style={[estilos.chipTexto, activo && { color: color.acento }]}>{texto}</Text>
    </Pressable>
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
  return (
    <View style={[estilos.etiqueta, { backgroundColor: t.fondo }]}>
      <Text style={[estilos.etiquetaTexto, { color: t.texto }]}>{texto}</Text>
    </View>
  );
}

// ---------------------------------------------------------------- Aviso (mensaje en una caja)
export function Aviso({ texto, tono = "acento", children }: { texto?: string; tono?: Tono; children?: ReactNode }) {
  const t = TONOS[tono];
  return (
    <View style={[estilos.aviso, { backgroundColor: t.fondo }]} accessibilityRole={tono === "mal" ? "alert" : undefined}>
      {texto ? <Text style={[estilos.avisoTexto, { color: tono === "" ? color.tinta : t.texto }]}>{texto}</Text> : null}
      {children}
    </View>
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
  return (
    <View style={estilos.cantidad} accessibilityLabel={`Cantidad de ${nombre}`}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Uno menos"
        disabled={valor <= min}
        onPress={() => onCambio(Math.max(min, valor - 1))}
        style={[estilos.cantBtn, valor <= min && { opacity: 0.35 }]}
        hitSlop={6}
      >
        <Text style={estilos.cantSigno}>−</Text>
      </Pressable>
      <Text style={estilos.cantValor}>{valor}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Uno más"
        disabled={valor >= max}
        onPress={() => onCambio(Math.min(max, valor + 1))}
        style={[estilos.cantBtn, valor >= max && { opacity: 0.35 }]}
        hitSlop={6}
      >
        <Text style={estilos.cantSigno}>+</Text>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------- Pantalla con desplazamiento
// Respeta la muesca del iPhone y deja espacio para la barra de pestañas.
export function Pantalla({
  children,
  refrescando,
  onRefrescar,
  conPestanas = true,
  style,
}: {
  children: ReactNode;
  refrescando?: boolean;
  onRefrescar?: () => void;
  conPestanas?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  const ios = Platform.OS === "ios";
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: color.fondo }}
      contentInsetAdjustmentBehavior={ios ? "automatic" : "never"}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={[
        {
          paddingHorizontal: margen,
          // En la web (solo para revisar en el computador) las pestañas van arriba.
          paddingTop: ios && conPestanas ? 8 : insets.top + 12 + (Platform.OS === "web" && conPestanas ? 64 : 0),
          paddingBottom: (ios ? 0 : insets.bottom) + (conPestanas ? 96 : 32),
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
    </ScrollView>
  );
}

// Título grande de una pantalla, con texto de apoyo y una acción a la derecha.
export function Encabezado({ titulo, sub, derecha }: { titulo: string; sub?: string; derecha?: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
      <View style={{ flex: 1, gap: 6 }}>
        <Texto v="titulo">{titulo}</Texto>
        {sub ? <Texto v="fino" style={{ fontSize: 14.5, lineHeight: 20 }}>{sub}</Texto> : null}
      </View>
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
  return (
    <View style={estilos.seg} accessibilityRole="radiogroup">
      {opciones.map((o) => {
        const activo = o.id === valor;
        return (
          <Pressable
            key={o.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: activo, disabled: o.deshabilitado }}
            disabled={o.deshabilitado}
            onPress={() => onCambio(o.id)}
            style={[estilos.segItem, activo && estilos.segActivo, o.deshabilitado && { opacity: 0.4 }]}
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

export function Cargando({ texto = "Cargando…" }: { texto?: string }) {
  return (
    <View style={{ paddingVertical: 40, alignItems: "center", gap: 12 }}>
      <ActivityIndicator color={color.acento} />
      <Texto v="fino">{texto}</Texto>
    </View>
  );
}

export const estilos = StyleSheet.create({
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
  segTexto: { fontFamily: fuente[500], fontSize: 14, color: color.suave },
});
