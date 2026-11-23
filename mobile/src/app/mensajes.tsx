import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useConversaciones, type Conversacion, type Lado } from "@/lib/chat";
import { fechaCO, iniciales } from "@/lib/formato";
import { useSesion } from "@/lib/sesion";
import { Aviso, Boton, Cargando, Tarjeta, Texto } from "@/ui/base";
import { Icono } from "@/ui/iconos";
import { color, margen, radio } from "@/tema";

// Bandeja del chat interno: el cliente ve sus conversaciones con las compañías (?lado=cliente) y la
// compañía, las preguntas de sus clientes (?lado=compania).
export default function Mensajes() {
  const { lado: l } = useLocalSearchParams<{ lado?: string }>();
  const lado: Lado = l === "compania" ? "compania" : "cliente";
  const { usuario } = useSesion();
  const insets = useSafeAreaInsets();
  const { lista, error, recargar } = useConversaciones(lado, !!usuario);
  const [refrescando, setRefrescando] = useState(false);

  if (!usuario) {
    return (
      <View style={{ flex: 1, padding: margen, gap: 12, backgroundColor: color.fondo }}>
        <Texto>Entra con tu cuenta para ver tus mensajes.</Texto>
        <Boton titulo="Entrar" onPress={() => router.push("/entrar")} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: color.fondo }}
      contentContainerStyle={{ padding: margen, gap: 12, paddingBottom: insets.bottom + 40 }}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl
          refreshing={refrescando}
          onRefresh={async () => {
            setRefrescando(true);
            await recargar();
            setRefrescando(false);
          }}
          tintColor={color.acento}
        />
      }
    >
      <Texto v="fino" style={{ fontSize: 14.5 }}>
        {lado === "cliente"
          ? "Tus conversaciones con las compañías. Pregunta lo que necesites antes de cotizar: no es una solicitud y no aparta equipos."
          : "Las preguntas de los clientes antes de cotizar. Responde aquí; las cotizaciones siguen llegando a tu panel y a tu WhatsApp."}
      </Texto>
      {error ? <Aviso tono="mal" texto={error} /> : null}
      {lista === null ? (
        <Cargando texto="Cargando tus mensajes…" />
      ) : lista.length ? (
        <View style={estilos.lista}>
          {lista.map((c, i) => (
            <Fila key={c.id} c={c} lado={lado} primera={i === 0} />
          ))}
        </View>
      ) : (
        <Tarjeta style={{ alignItems: "center", gap: 12, paddingVertical: 28 }}>
          <View style={estilos.vacioIcono}>
            <Icono n="chat" tam={28} tinta={color.acento} />
          </View>
          <Texto v="subtitulo" style={{ textAlign: "center" }}>
            Aún no tienes mensajes
          </Texto>
          <Texto v="fino" style={{ textAlign: "center", fontSize: 14.5 }}>
            {lado === "cliente"
              ? "En la ficha de un equipo o de una compañía toca «Hacer una pregunta» para escribirle."
              : "Cuando un cliente te pregunte algo antes de cotizar, aparece aquí."}
          </Texto>
        </Tarjeta>
      )}
    </ScrollView>
  );
}

function Fila({ c, lado, primera }: { c: Conversacion; lado: Lado; primera: boolean }) {
  const nombre = lado === "cliente" ? c.compania_nombre : c.cliente_nombre || "Cliente";
  const ultimo = c.ultimo_texto ? `${c.ultimo_autor === lado ? "Tú: " : ""}${c.ultimo_texto}` : "Sin mensajes todavía";
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/chat/[id]", params: { id: c.id, lado, titulo: nombre } })}
      style={({ pressed }) => [estilos.fila, !primera && estilos.linea, pressed && { opacity: 0.6 }]}
      accessibilityRole="button"
      accessibilityLabel={`Conversación con ${nombre}${c.sin_leer ? `, ${c.sin_leer} sin leer` : ""}`}
    >
      <View style={estilos.avatar}>
        <Texto peso={700} tono="#FFFFFF" style={{ fontSize: 15 }}>
          {iniciales(nombre)}
        </Texto>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Texto peso={600} numberOfLines={1} style={{ flex: 1, fontSize: 15.5 }}>
            {nombre}
            {lado === "cliente" && c.compania_verificada ? " ✓" : ""}
          </Texto>
          <Texto v="fino" style={{ fontSize: 12 }}>
            {fechaCO(c.ultimo_mensaje).split(" · ")[0]}
          </Texto>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Texto v="fino" numberOfLines={1} peso={c.sin_leer ? 600 : 400} tono={c.sin_leer ? color.tinta : color.suave} style={{ flex: 1 }}>
            {ultimo}
          </Texto>
          {c.sin_leer ? (
            <View style={estilos.contador}>
              <Texto peso={700} tono="#FFFFFF" style={{ fontSize: 12 }}>
                {c.sin_leer}
              </Texto>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  lista: { backgroundColor: color.superficie, borderRadius: radio.lg, borderWidth: 1, borderColor: color.linea, paddingHorizontal: 14 },
  fila: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13 },
  linea: { borderTopWidth: 1, borderTopColor: color.linea },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: color.acento, alignItems: "center", justifyContent: "center" },
  contador: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: color.coral, alignItems: "center", justifyContent: "center" },
  vacioIcono: { width: 60, height: 60, borderRadius: 30, backgroundColor: color.acentoSuave, alignItems: "center", justifyContent: "center" },
});
