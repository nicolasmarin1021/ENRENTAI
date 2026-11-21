import * as Haptics from "expo-haptics";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Icono } from "@/ui/iconos";
import { color, fuente } from "@/tema";

// Los dos subpaneles de "Buscar equipos" (arriba, como las secciones de Airbnb):
// - Buscar equipos: el pedido guiado en 3 pasos y el mapa con las compañías que lo tienen.
// - Explorar: todos los equipos publicados, en lista o en el mapa.
export type Vista = "buscar" | "explorar";

const OPCIONES = [
  { id: "buscar", texto: "Buscar equipos", icono: "buscar" },
  { id: "explorar", texto: "Explorar", icono: "cuadricula" },
] as const;

export function Subpaneles({ vista, onCambio }: { vista: Vista; onCambio: (v: Vista) => void }) {
  return (
    <View style={estilos.fila} accessibilityRole="tablist">
      {OPCIONES.map((o) => {
        const activo = o.id === vista;
        return (
          <Pressable
            key={o.id}
            onPress={() => {
              if (activo) return;
              if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
              onCambio(o.id);
            }}
            style={({ pressed }) => [estilos.opcion, pressed && { opacity: 0.6 }]}
            accessibilityRole="tab"
            accessibilityState={{ selected: activo }}
          >
            <View style={estilos.dentro}>
              <Icono n={o.icono} tam={18} tinta={activo ? color.tinta : color.suave} grosor={activo ? 2.1 : 1.8} />
              <Text style={[estilos.texto, activo && estilos.textoActivo]} numberOfLines={1}>
                {o.texto}
              </Text>
            </View>
            <View style={[estilos.raya, activo && { backgroundColor: color.tinta }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: color.linea, marginBottom: 12 },
  opcion: { flex: 1, alignItems: "center" },
  dentro: { flexDirection: "row", alignItems: "center", gap: 7, height: 38 },
  texto: { fontFamily: fuente[500], fontSize: 14.5, color: color.suave },
  textoActivo: { fontFamily: fuente[600], color: color.tinta },
  raya: { alignSelf: "stretch", height: 2.5, borderRadius: 2, marginHorizontal: 14, marginBottom: -1, backgroundColor: "transparent" },
});
