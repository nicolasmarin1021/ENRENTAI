import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSesion, type Modo } from "@/lib/sesion";
import { color, fuente, radio } from "@/tema";

// Interruptor Necesito | Tengo (como el de la web): siempre arriba a la derecha.
// Al cambiar, la app pasa a las pestañas de ese modo.
export function SelectorModo({ flotante = false }: { flotante?: boolean }) {
  const { modo, cambiarModo } = useSesion();

  function elegir(m: Modo) {
    if (m === modo) return;
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    cambiarModo(m);
    router.replace(m === "tengo" ? "/panel" : "/explorar");
  }

  return (
    <View style={[estilos.pista, flotante && estilos.flotante]} accessibilityRole="radiogroup" accessibilityLabel="Usar ENRENTA como">
      {(
        [
          { id: "necesito", texto: "Necesito" },
          { id: "tengo", texto: "Tengo" },
        ] as const
      ).map((o) => {
        const activo = o.id === modo;
        return (
          <Pressable
            key={o.id}
            onPress={() => elegir(o.id)}
            style={[estilos.opcion, activo && estilos.activa]}
            accessibilityRole="radio"
            accessibilityState={{ selected: activo }}
            accessibilityLabel={o.id === "necesito" ? "Necesito equipos" : "Tengo equipos"}
            hitSlop={4}
          >
            <Text style={[estilos.texto, activo && { color: color.tinta }]}>{o.texto}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  pista: {
    flexDirection: "row",
    padding: 3,
    gap: 2,
    borderRadius: radio.pildora,
    backgroundColor: color.superficie2,
    borderWidth: 1,
    borderColor: color.linea,
  },
  // Sobre el mapa: fondo blanco y sombra para que se lea encima de las calles.
  flotante: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderColor: "rgba(16,24,40,0.06)",
    shadowColor: "#101828",
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  opcion: { height: 32, paddingHorizontal: 14, borderRadius: radio.pildora, alignItems: "center", justifyContent: "center" },
  activa: {
    backgroundColor: color.superficie,
    shadowColor: "#101828",
    shadowOpacity: 0.14,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  texto: { fontFamily: fuente[600], fontSize: 13.5, color: color.suave },
});
