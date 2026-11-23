import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { useSinLeer, type Lado } from "@/lib/chat";
import { useSesion } from "@/lib/sesion";
import { Texto } from "@/ui/base";
import { Icono } from "@/ui/iconos";
import { color, radio } from "@/tema";

// Acceso a la bandeja del chat (en Mis solicitudes para el cliente y en el Panel para la compañía),
// con cuántos mensajes hay sin leer.
export function AccesoMensajes({ lado }: { lado: Lado }) {
  const { usuario } = useSesion();
  const n = useSinLeer(lado, !!usuario);
  if (!usuario) return null;
  const titulo = lado === "cliente" ? "Mensajes con compañías" : "Preguntas de clientes";
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/mensajes", params: { lado } })}
      style={({ pressed }) => [estilos.caja, pressed && { opacity: 0.7 }]}
      accessibilityRole="button"
      accessibilityLabel={`${titulo}${n ? `, ${n} sin leer` : ""}`}
    >
      <View style={estilos.icono}>
        <Icono n="chat" tam={21} tinta={color.acento} />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Texto peso={600} style={{ fontSize: 15.5 }}>
          {titulo}
        </Texto>
        <Texto v="fino">
          {n
            ? `${n} ${n === 1 ? "mensaje sin leer" : "mensajes sin leer"}`
            : lado === "cliente"
              ? "Pregunta antes de cotizar, sin apartar equipos"
              : "Responde sus dudas antes de que coticen"}
        </Texto>
      </View>
      {n ? (
        <View style={estilos.contador}>
          <Texto peso={700} tono="#FFFFFF" style={{ fontSize: 12.5 }}>
            {n}
          </Texto>
        </View>
      ) : null}
      <Icono n="flecha" tam={18} tinta={color.suave} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  caja: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: radio.lg,
    backgroundColor: color.superficie,
    borderWidth: 1,
    borderColor: color.linea,
  },
  icono: { width: 42, height: 42, borderRadius: 21, backgroundColor: color.acentoSuave, alignItems: "center", justifyContent: "center" },
  contador: { minWidth: 24, height: 24, borderRadius: 12, paddingHorizontal: 7, backgroundColor: color.coral, alignItems: "center", justifyContent: "center" },
});
