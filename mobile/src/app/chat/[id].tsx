import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, type ScrollViewInstance } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { enviarMensaje, useMensajes, type Lado, type Mensaje } from "@/lib/chat";
import { fechaCO, iniciales } from "@/lib/formato";
import { useSesion } from "@/lib/sesion";
import { supabase } from "@/lib/supabase";
import { Aviso, Boton, Cargando, Texto } from "@/ui/base";
import { Icono } from "@/ui/iconos";
import { color, fuente, margen, radio } from "@/tema";

type Info = { nombre: string; detalle: string; companiaId: string };

// Una conversación del chat interno entre cliente y compañía. El cliente pregunta lo que necesite
// antes de cotizar (no es una solicitud y no aparta equipos); la compañía le responde aquí.
// Los mensajes llegan en tiempo real.
export default function Chat() {
  const { id, lado: l, texto: inicial, titulo } = useLocalSearchParams<{ id: string; lado?: string; texto?: string; titulo?: string }>();
  const lado: Lado = l === "compania" ? "compania" : "cliente";
  const { usuario } = useSesion();
  const insets = useSafeAreaInsets();
  const { mensajes, error, agregar } = useMensajes(usuario ? id : "", lado);
  const [texto, setTexto] = useState(inicial ?? "");
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState("");
  const [info, setInfo] = useState<Info | null>(null);

  // Con quién se habla: la compañía (para el cliente) o el cliente (para la compañía).
  useEffect(() => {
    if (!id || !usuario) return;
    let vivo = true;
    void supabase
      .from("conversaciones")
      .select("cliente_nombre, compania_id, companias(nombre, zona, verificada)")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        if (!vivo || !data) return;
        const d = data as unknown as {
          cliente_nombre: string;
          compania_id: string;
          companias: { nombre: string; zona: string | null; verificada: boolean } | null;
        };
        setInfo(
          lado === "cliente"
            ? {
                nombre: d.companias?.nombre ?? titulo ?? "Compañía",
                detalle: [d.companias?.verificada ? "Compañía verificada" : "Compañía", d.companias?.zona].filter(Boolean).join(" · "),
                companiaId: d.compania_id,
              }
            : { nombre: d.cliente_nombre || "Cliente", detalle: "Cliente de ENRENTA", companiaId: d.compania_id },
        );
      });
    return () => {
      vivo = false;
    };
  }, [id, lado, titulo, usuario]);

  async function enviar() {
    const t = texto.trim();
    if (!t || enviando) return;
    setEnviando(true);
    setErrorEnvio("");
    const r = await enviarMensaje(id, lado, t);
    setEnviando(false);
    if (!r.m) return setErrorEnvio(r.error);
    setTexto("");
    agregar([r.m]);
  }

  const nombre = info?.nombre ?? titulo ?? "Conversación";

  if (!usuario) {
    return (
      <View style={{ flex: 1, padding: margen, paddingTop: insets.top + 60, gap: 12, backgroundColor: color.fondo }}>
        <Stack.Screen options={{ headerShown: false }} />
        <Texto>Entra con tu cuenta para ver esta conversación.</Texto>
        <Boton titulo="Entrar" onPress={() => router.replace("/entrar")} />
      </View>
    );
  }

  return (
    <VistaChat
      lado={lado}
      nombre={nombre}
      detalle={info?.detalle ?? ""}
      mensajes={mensajes}
      error={error}
      texto={texto}
      onTexto={setTexto}
      onEnviar={enviar}
      enviando={enviando}
      errorEnvio={errorEnvio}
      onPerfil={lado === "cliente" && info ? () => router.push({ pathname: "/compania/[id]", params: { id: info.companiaId } }) : undefined}
    />
  );
}

// Solo dibuja (los datos los trae Chat): así se puede revisar con datos de ejemplo.
export function VistaChat({
  lado,
  nombre,
  detalle,
  mensajes,
  error,
  texto,
  onTexto,
  onEnviar,
  enviando,
  errorEnvio,
  onPerfil,
}: {
  lado: Lado;
  nombre: string;
  detalle: string;
  mensajes: Mensaje[] | null;
  error: string;
  texto: string;
  onTexto: (v: string) => void;
  onEnviar: () => void;
  enviando: boolean;
  errorEnvio: string;
  onPerfil?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollViewInstance>(null);
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: color.fondo }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Encabezado: con quién hablo (el cliente puede abrir el perfil de la compañía). */}
      <View style={[estilos.cabecera, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => router.back()} style={estilos.atras} hitSlop={8} accessibilityRole="button" accessibilityLabel="Volver">
          <Icono n="atras" tam={20} grosor={2} />
        </Pressable>
        <View style={estilos.avatar}>
          <Texto peso={700} tono="#FFFFFF" style={{ fontSize: 14 }}>
            {iniciales(nombre)}
          </Texto>
        </View>
        <Pressable
          style={{ flex: 1 }}
          disabled={!onPerfil}
          onPress={onPerfil}
          accessibilityRole={onPerfil ? "button" : undefined}
          accessibilityLabel={onPerfil ? `Ver el perfil de ${nombre}` : undefined}
        >
          <Texto peso={600} numberOfLines={1} style={{ fontSize: 16.5 }}>
            {nombre}
          </Texto>
          {detalle ? (
            <Texto v="fino" numberOfLines={1}>
              {detalle}
            </Texto>
          ) : null}
        </Pressable>
      </View>

      <ScrollView
        ref={scroll}
        contentContainerStyle={{ padding: margen, gap: 8, flexGrow: 1 }}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <Aviso
          tono="acento"
          texto={
            lado === "cliente"
              ? "Pregunta lo que necesites antes de cotizar. Esto no es una solicitud: no aparta equipos. Cuando quieras cotizar, hazlo desde tu rider."
              : "Responde las preguntas del cliente. Las cotizaciones siguen llegando a tu panel y a tu WhatsApp."
          }
        />
        {error ? <Aviso tono="mal" texto={error} /> : null}
        {mensajes === null ? (
          <Cargando texto="Cargando la conversación…" />
        ) : mensajes.length ? (
          mensajes.map((m) => <Burbuja key={m.id} m={m} mia={m.autor === lado} />)
        ) : (
          <Texto v="fino" style={{ textAlign: "center", marginTop: 12 }}>
            {lado === "cliente" ? `Escríbele a ${nombre}: por ejemplo, si un equipo trae baterías o si entregan en tu lugar.` : "Todavía no hay mensajes."}
          </Texto>
        )}
      </ScrollView>

      {errorEnvio ? (
        <View style={{ paddingHorizontal: margen, paddingBottom: 6 }}>
          <Aviso tono="mal" texto={errorEnvio} />
        </View>
      ) : null}

      {/* Escribir */}
      <View style={[estilos.barra, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          value={texto}
          onChangeText={(v) => onTexto(v.slice(0, 2000))}
          placeholder={lado === "cliente" ? "Escribe tu pregunta" : "Escribe tu respuesta"}
          placeholderTextColor="#9AA0AE"
          multiline
          style={estilos.entrada}
          accessibilityLabel="Mensaje"
        />
        <Pressable
          onPress={onEnviar}
          disabled={!texto.trim() || enviando}
          style={({ pressed }) => [estilos.enviar, (!texto.trim() || enviando) && { opacity: 0.45 }, pressed && { opacity: 0.8 }]}
          accessibilityRole="button"
          accessibilityLabel="Enviar"
        >
          <Icono n="enviar" tam={19} tinta="#FFFFFF" grosor={2} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

// Un mensaje: los míos a la derecha (azules), los del otro a la izquierda y los avisos de las
// solicitudes en el centro.
function Burbuja({ m, mia }: { m: Mensaje; mia: boolean }) {
  if (m.autor === "sistema") {
    return (
      <View style={estilos.sistema}>
        <Texto v="fino" style={{ textAlign: "center", fontSize: 13 }}>
          {m.texto}
        </Texto>
      </View>
    );
  }
  return (
    <View style={[estilos.burbuja, mia ? estilos.mia : estilos.suya]}>
      <Texto tono={mia ? "#FFFFFF" : color.tinta} style={{ fontSize: 15.5, lineHeight: 21 }}>
        {m.texto}
      </Texto>
      <Texto tono={mia ? "rgba(255,255,255,0.75)" : color.suave} style={{ fontSize: 11.5, alignSelf: "flex-end" }}>
        {fechaCO(m.creado)}
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  cabecera: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: color.superficie,
    borderBottomWidth: 1,
    borderBottomColor: color.linea,
  },
  atras: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: color.acento, alignItems: "center", justifyContent: "center" },
  sistema: { alignSelf: "center", maxWidth: "88%", backgroundColor: color.superficie2, borderRadius: radio.md, paddingHorizontal: 12, paddingVertical: 6 },
  burbuja: { maxWidth: "82%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9, gap: 2 },
  mia: { alignSelf: "flex-end", backgroundColor: color.acento, borderBottomRightRadius: 6 },
  suya: { alignSelf: "flex-start", backgroundColor: color.superficie, borderBottomLeftRadius: 6, borderWidth: 1, borderColor: color.linea },
  barra: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: color.superficie,
    borderTopWidth: 1,
    borderTopColor: color.linea,
  },
  entrada: {
    flex: 1,
    minHeight: 44,
    maxHeight: 130,
    paddingHorizontal: 16,
    paddingTop: 11,
    paddingBottom: 11,
    borderRadius: 22,
    backgroundColor: color.superficie2,
    fontFamily: fuente[400],
    fontSize: 15.5,
    color: color.tinta,
  },
  enviar: { width: 44, height: 44, borderRadius: 22, backgroundColor: color.acento, alignItems: "center", justifyContent: "center" },
});
