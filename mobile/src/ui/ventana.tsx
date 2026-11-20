import type { ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { color, margen } from "@/tema";
import { Texto } from "./base";
import { Icono } from "./iconos";

// Ventana que sube desde abajo (para ver el detalle de un día o de una solicitud sin salir
// de la pantalla). Se cierra con la ×, tocando afuera o con el gesto de atrás.
export function Ventana({
  visible,
  onCerrar,
  titulo,
  sub,
  children,
}: {
  visible: boolean;
  onCerrar: () => void;
  titulo: string;
  sub?: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCerrar} statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable style={estilos.fondo} onPress={onCerrar} accessibilityLabel="Cerrar" />
        <View style={[estilos.hoja, { paddingBottom: insets.bottom + 16 }]}>
          <View style={estilos.asa} />
          <View style={estilos.cabeza}>
            <View style={{ flex: 1, gap: 2 }}>
              <Texto v="subtitulo">{titulo}</Texto>
              {sub ? <Texto v="fino">{sub}</Texto> : null}
            </View>
            <Pressable onPress={onCerrar} style={estilos.cerrar} accessibilityRole="button" accessibilityLabel="Cerrar" hitSlop={8}>
              <Icono n="cerrar" tam={16} grosor={2.2} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: margen, gap: 14, paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: "rgba(20,24,32,0.45)" },
  hoja: {
    maxHeight: "86%",
    backgroundColor: color.superficie,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
  },
  asa: { alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: color.lineaFuerte, marginBottom: 6 },
  cabeza: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: margen, paddingTop: 6, paddingBottom: 12 },
  cerrar: { width: 32, height: 32, borderRadius: 16, backgroundColor: color.superficie2, alignItems: "center", justifyContent: "center" },
});
