import * as Linking from "expo-linking";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSesion } from "@/lib/sesion";
import { supabase } from "@/lib/supabase";
import { Aviso, Boton, Campo, Texto } from "@/ui/base";
import { Icono } from "@/ui/iconos";
import { Simbolo } from "@/ui/marca";
import { color, margen } from "@/tema";

// Cierra la ventana; si la app se abrió directo aquí (desde el enlace del correo), va al inicio.
const cerrar = () => (router.canGoBack() ? router.back() : router.replace("/"));

const ESPERA_REENVIO = 60; // segundos; Supabase no deja pedir otro código antes

function mensajeError(e: { code?: string; status?: number }) {
  switch (e.code) {
    case "invalid_credentials":
      return "Correo o contraseña incorrectos.";
    case "otp_expired":
      return "El código no es correcto o ya venció. Revisa el último correo o pide uno nuevo.";
    case "email_address_invalid":
      return "Ese correo no parece válido. Revísalo e intenta de nuevo.";
    case "email_address_not_authorized":
      return "Este correo todavía no puede recibir códigos: mientras ENRENTA está en pruebas, solo llegan al correo de tu cuenta de Supabase.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Pediste varios correos seguidos. Espera un minuto y vuelve a intentarlo.";
  }
  if (e.status === 429) return "Demasiados intentos seguidos. Espera un minuto y vuelve a intentarlo.";
  return "No pudimos completar este paso. Revisa tu conexión e intenta de nuevo.";
}

// Entrada sin contraseña (igual que la web): correo → enlace o código del correo → nombre (la primera vez).
// En el celular, el enlace del correo vuelve a abrir la app y la sesión se completa sola (lib/sesion.tsx).
export default function Entrar() {
  const { usuario, nombre, errorEnlace, recargarPerfil } = useSesion();
  const insets = useSafeAreaInsets();
  const [paso, setPaso] = useState<"correo" | "revisar" | "clave">("correo");
  const [correo, setCorreo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [clave, setClave] = useState("");
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [espera, setEspera] = useState(0);
  const [perfilLeido, setPerfilLeido] = useState(false);

  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  // Cuando ya hay sesión: se lee el perfil y, si ya tiene nombre, se cierra esta ventana.
  useEffect(() => {
    if (!usuario) return;
    let vivo = true;
    recargarPerfil().finally(() => {
      if (vivo) setPerfilLeido(true);
    });
    return () => {
      vivo = false;
    };
  }, [usuario, recargarPerfil]);

  useEffect(() => {
    if (usuario && perfilLeido && nombre) cerrar();
  }, [usuario, perfilLeido, nombre]);

  async function enviarCorreo() {
    const email = correo.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Escribe un correo válido, por ejemplo nombre@correo.com.");
    setOcupado(true);
    setError("");
    setAviso("");
    const { error: e } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo: Linking.createURL("entrar") },
    });
    setOcupado(false);
    if (e) return setError(mensajeError(e));
    setCorreo(email);
    setEspera(ESPERA_REENVIO);
    setPaso("revisar");
  }

  async function verificarCodigo() {
    if (codigo.length < 6) return setError("Escribe el código completo que llegó a tu correo.");
    setOcupado(true);
    setError("");
    const { error: e } = await supabase.auth.verifyOtp({ email: correo, token: codigo, type: "email" });
    setOcupado(false);
    if (e) setError(mensajeError(e));
  }

  async function entrarConClave() {
    const email = correo.trim().toLowerCase();
    if (!email || !clave) return setError("Escribe el correo y la contraseña de la cuenta de prueba.");
    setOcupado(true);
    setError("");
    const { error: e } = await supabase.auth.signInWithPassword({ email, password: clave });
    setOcupado(false);
    setClave("");
    if (e) setError(mensajeError(e));
  }

  async function guardarNombre() {
    const limpio = nuevoNombre.trim().replace(/\s+/g, " ");
    if (limpio.length < 2) return setError("Escribe tu nombre o el de tu productora.");
    setOcupado(true);
    setError("");
    const { error: e } = await supabase.from("perfiles").update({ nombre: limpio.slice(0, 120) }).eq("id", usuario!.id);
    if (e) {
      setOcupado(false);
      return setError("No pudimos guardar tu nombre. Intenta de nuevo.");
    }
    await recargarPerfil();
    setOcupado(false);
  }

  let contenido;
  if (usuario && !perfilLeido) {
    contenido = <Texto v="fino">Entrando…</Texto>;
  } else if (usuario && !nombre) {
    contenido = (
      <>
        <Texto v="titulo">¿Cómo te llamas?</Texto>
        <Texto v="fino">Así te verán las compañías cuando les pidas una cotización.</Texto>
        <Campo etiqueta="Tu nombre o el de tu productora" value={nuevoNombre} onChangeText={setNuevoNombre} autoFocus autoComplete="name" onSubmitEditing={guardarNombre} />
        {error ? <Aviso tono="mal" texto={error} /> : null}
        <Boton titulo="Continuar" bloque cargando={ocupado} onPress={guardarNombre} />
      </>
    );
  } else if (paso === "revisar") {
    contenido = (
      <>
        <Texto v="titulo">Revisa tu correo</Texto>
        <Texto>
          Te enviamos un correo a <Texto peso={600}>{correo}</Texto>. Ábrelo <Texto peso={600}>en este celular</Texto> y toca el enlace: la app se
          abre y entras sola.
        </Texto>
        <Texto v="fino">Si el correo trae un código de 6 dígitos, también puedes escribirlo aquí.</Texto>
        <Campo
          etiqueta="Código del correo"
          value={codigo}
          onChangeText={(v) => setCodigo(v.replace(/\D/g, "").slice(0, 8))}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          placeholder="123456"
        />
        {errorEnlace ? <Aviso tono="mal" texto={errorEnlace} /> : null}
        {error ? <Aviso tono="mal" texto={error} /> : null}
        {aviso ? <Aviso tono="ok" texto={aviso} /> : null}
        <Boton titulo="Entrar con el código" bloque cargando={ocupado} deshabilitado={codigo.length < 6} onPress={verificarCodigo} />
        <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <Boton
            titulo={espera > 0 ? `Reenviar en ${espera} s` : "Reenviar el correo"}
            tipo="enlace"
            deshabilitado={espera > 0 || ocupado}
            onPress={async () => {
              await enviarCorreo();
              setAviso("Te enviamos un correo nuevo. Usa el más reciente.");
            }}
          />
          <Boton titulo="Cambiar de correo" tipo="enlace" onPress={() => setPaso("correo")} />
        </View>
      </>
    );
  } else if (paso === "clave") {
    contenido = (
      <>
        <Texto v="titulo">Acceso de prueba</Texto>
        <Texto v="fino">Solo aparece mientras desarrollamos la app. Las personas reales entran con el correo.</Texto>
        <Campo etiqueta="Correo de la cuenta de prueba" value={correo} onChangeText={setCorreo} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
        <Campo etiqueta="Contraseña" value={clave} onChangeText={setClave} secureTextEntry autoComplete="current-password" onSubmitEditing={entrarConClave} />
        {error ? <Aviso tono="mal" texto={error} /> : null}
        <Boton titulo="Entrar" bloque cargando={ocupado} onPress={entrarConClave} />
        <Boton titulo="Volver a la entrada con correo" tipo="enlace" onPress={() => setPaso("correo")} style={{ alignSelf: "center" }} />
      </>
    );
  } else {
    contenido = (
      <>
        <Texto v="titulo">Entra a ENRENTA</Texto>
        <Texto v="fino">Sin contraseña: te enviamos un enlace a tu correo. Si es la primera vez, tu cuenta se crea sola.</Texto>
        <Campo
          etiqueta="Tu correo"
          value={correo}
          onChangeText={setCorreo}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          placeholder="nombre@correo.com"
          onSubmitEditing={enviarCorreo}
        />
        {errorEnlace ? <Aviso tono="mal" texto={errorEnlace} /> : null}
        {error ? <Aviso tono="mal" texto={error} /> : null}
        <Boton titulo="Enviarme el enlace" bloque cargando={ocupado} onPress={enviarCorreo} />
        {__DEV__ ? (
          <Boton
            titulo="Usar la cuenta de prueba"
            tipo="enlace"
            onPress={() => {
              setError("");
              setPaso("clave");
            }}
            style={{ alignSelf: "center" }}
          />
        ) : null}
      </>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: color.fondo }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[estilos.cont, { paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
        <View style={estilos.cabeza}>
          <Simbolo tam={56} />
          <Pressable onPress={() => cerrar()} style={estilos.cerrar} accessibilityRole="button" accessibilityLabel="Cerrar">
            <Icono n="cerrar" tam={18} />
          </Pressable>
        </View>
        {contenido}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  cont: { padding: margen, paddingTop: 20, gap: 14 },
  cabeza: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cerrar: { width: 36, height: 36, borderRadius: 18, backgroundColor: color.superficie2, alignItems: "center", justifyContent: "center" },
});
