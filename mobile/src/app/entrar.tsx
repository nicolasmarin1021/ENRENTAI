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

const ESPERA_REENVIO = 60; // segundos; Supabase no deja pedir otro correo antes
const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_CLAVE = 8;

function mensajeError(e: { code?: string; status?: number }) {
  switch (e.code) {
    case "invalid_credentials":
      return "Correo o contraseña incorrectos.";
    case "email_not_confirmed":
      return "Todavía no confirmas tu correo. Abre el correo que te enviamos y toca el enlace.";
    case "user_already_exists":
    case "email_exists":
      return "Ya existe una cuenta con ese correo. Entra con tu contraseña.";
    case "weak_password":
      return `La contraseña es muy débil: usa al menos ${MIN_CLAVE} caracteres, con letras y números.`;
    case "signup_disabled":
      return "Por ahora no se pueden crear cuentas nuevas.";
    case "otp_expired":
      return "El código no es correcto o ya venció. Revisa el último correo o pide uno nuevo.";
    case "email_address_invalid":
      return "Ese correo no parece válido. Revísalo e intenta de nuevo.";
    case "email_address_not_authorized":
      return "Este correo todavía no puede recibir correos de ENRENTA: mientras estamos en pruebas, solo llegan al correo de la cuenta de Supabase.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Pediste varios correos seguidos. Espera un minuto y vuelve a intentarlo.";
  }
  if (e.status === 429) return "Demasiados intentos seguidos. Espera un minuto y vuelve a intentarlo.";
  return "No pudimos completar este paso. Revisa tu conexión e intenta de nuevo.";
}

// Celular de Colombia: 10 dígitos que empiezan por 3 (acepta +57, espacios y guiones).
function celularColombia(v: string) {
  let d = v.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("57")) d = d.slice(2);
  return /^3\d{9}$/.test(d) ? `+57${d}` : null;
}

type Paso = "entrar" | "registro" | "confirmar" | "enlace" | "revisar";

// Entrada a ENRENTA con correo y contraseña. Crear cuenta pide nombre completo, celular, correo y
// contraseña (dos veces); Supabase envía un correo para confirmarlo y, al tocar el enlace en el
// celular, la app se abre y entra sola (lib/sesion.tsx). Las cuentas antiguas, creadas sin
// contraseña, todavía pueden entrar con un enlace al correo.
export default function Entrar() {
  const { usuario, nombre, errorEnlace, recargarPerfil } = useSesion();
  const insets = useSafeAreaInsets();
  const [paso, setPaso] = useState<Paso>("entrar");
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [celular, setCelular] = useState("");
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [clave2, setClave2] = useState("");
  const [verClave, setVerClave] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [espera, setEspera] = useState(0);
  const [perfilLeido, setPerfilLeido] = useState(false);
  const enlaceApp = Linking.createURL("entrar");

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

  function ir(p: Paso) {
    setError("");
    setAviso("");
    setClave("");
    setClave2("");
    setPaso(p);
  }

  async function entrar() {
    const email = correo.trim().toLowerCase();
    if (!CORREO_VALIDO.test(email)) return setError("Escribe tu correo, por ejemplo nombre@correo.com.");
    if (!clave) return setError("Escribe tu contraseña.");
    setOcupado(true);
    setError("");
    const { error: e } = await supabase.auth.signInWithPassword({ email, password: clave });
    setOcupado(false);
    setClave("");
    if (e) {
      setCorreo(email);
      setError(mensajeError(e));
      if (e.code === "email_not_confirmed") setPaso("confirmar");
    }
  }

  async function crearCuenta() {
    const nombreLimpio = nombreCompleto.trim().replace(/\s+/g, " ");
    const email = correo.trim().toLowerCase();
    const tel = celularColombia(celular);
    if (nombreLimpio.split(" ").length < 2 || nombreLimpio.length < 5) return setError("Escribe tu nombre completo (nombre y apellido).");
    if (!tel) return setError("Escribe tu celular de Colombia: 10 dígitos, empieza por 3.");
    if (!CORREO_VALIDO.test(email)) return setError("Escribe un correo válido, por ejemplo nombre@correo.com.");
    if (clave.length < MIN_CLAVE || !/[a-zA-Z]/.test(clave) || !/\d/.test(clave))
      return setError(`La contraseña necesita al menos ${MIN_CLAVE} caracteres, con letras y números.`);
    if (clave !== clave2) return setError("Las contraseñas no coinciden.");
    setOcupado(true);
    setError("");
    const { data, error: e } = await supabase.auth.signUp({
      email,
      password: clave,
      options: { emailRedirectTo: enlaceApp, data: { nombre: nombreLimpio.slice(0, 120), telefono: tel } },
    });
    setOcupado(false);
    setCorreo(email);
    if (e) return setError(mensajeError(e));
    // Si el correo ya tenía cuenta, Supabase no lo dice directamente: devuelve un usuario sin identidades.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setClave("");
      setClave2("");
      setPaso("entrar");
      return setError("Ya existe una cuenta con ese correo. Entra con tu contraseña.");
    }
    setClave("");
    setClave2("");
    // Sin confirmación de correo (si está apagada en Supabase) ya hay sesión y la ventana se cierra sola.
    if (!data.session) {
      setEspera(ESPERA_REENVIO);
      setPaso("confirmar");
    }
  }

  async function reenviarConfirmacion() {
    setOcupado(true);
    setError("");
    setAviso("");
    const { error: e } = await supabase.auth.resend({ type: "signup", email: correo, options: { emailRedirectTo: enlaceApp } });
    setOcupado(false);
    if (e) return setError(mensajeError(e));
    setEspera(ESPERA_REENVIO);
    setAviso("Te enviamos el correo de nuevo. Usa el más reciente.");
  }

  // Cuentas antiguas sin contraseña: enlace o código al correo (no crea cuentas nuevas).
  async function enviarEnlace() {
    const email = correo.trim().toLowerCase();
    if (!CORREO_VALIDO.test(email)) return setError("Escribe un correo válido, por ejemplo nombre@correo.com.");
    setOcupado(true);
    setError("");
    setAviso("");
    const { error: e } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: enlaceApp } });
    setOcupado(false);
    if (e) {
      return setError(
        e.code === "otp_disabled" || e.code === "user_not_found" || e.status === 422 ? "No hay una cuenta con ese correo. Crea una nueva." : mensajeError(e),
      );
    }
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

  async function guardarNombre() {
    const limpio = nuevoNombre.trim().replace(/\s+/g, " ");
    if (limpio.length < 2) return setError("Escribe tu nombre completo.");
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

  const verOcultar = (
    <Boton titulo={verClave ? "Ocultar contraseña" : "Ver contraseña"} tipo="enlace" onPress={() => setVerClave(!verClave)} style={{ alignSelf: "flex-end", marginTop: -8 }} />
  );
  const mensajes = (
    <>
      {errorEnlace ? <Aviso tono="mal" texto={errorEnlace} /> : null}
      {error ? <Aviso tono="mal" texto={error} /> : null}
      {aviso ? <Aviso tono="ok" texto={aviso} /> : null}
    </>
  );

  let contenido;
  if (usuario && !perfilLeido) {
    contenido = <Texto v="fino">Entrando…</Texto>;
  } else if (usuario && !nombre) {
    contenido = (
      <>
        <Texto v="titulo">¿Cómo te llamas?</Texto>
        <Texto v="fino">Así te verán las compañías cuando les pidas una cotización.</Texto>
        <Campo etiqueta="Tu nombre completo" value={nuevoNombre} onChangeText={setNuevoNombre} autoFocus autoComplete="name" onSubmitEditing={guardarNombre} />
        {error ? <Aviso tono="mal" texto={error} /> : null}
        <Boton titulo="Continuar" bloque cargando={ocupado} onPress={guardarNombre} />
      </>
    );
  } else if (paso === "registro") {
    contenido = (
      <>
        <Texto v="titulo">Crea tu cuenta</Texto>
        <Texto v="fino">Con tu cuenta pides cotizaciones, guardas equipos o publicas los de tu compañía.</Texto>
        <Campo
          etiqueta="Nombre completo"
          value={nombreCompleto}
          onChangeText={(v) => setNombreCompleto(v.slice(0, 120))}
          autoComplete="name"
          textContentType="name"
          autoCapitalize="words"
          placeholder="Nombre y apellido"
        />
        <Campo
          etiqueta="Celular"
          value={celular}
          onChangeText={(v) => setCelular(v.replace(/[^\d+\s-]/g, "").slice(0, 16))}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          placeholder="300 123 4567"
          ayuda="Celular de Colombia. Las compañías te contactan por WhatsApp."
        />
        <Campo
          etiqueta="Correo electrónico"
          value={correo}
          onChangeText={setCorreo}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          placeholder="nombre@correo.com"
        />
        <Campo
          etiqueta="Contraseña"
          value={clave}
          onChangeText={setClave}
          secureTextEntry={!verClave}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          ayuda={`Mínimo ${MIN_CLAVE} caracteres, con letras y números.`}
        />
        <Campo
          etiqueta="Repite la contraseña"
          value={clave2}
          onChangeText={setClave2}
          secureTextEntry={!verClave}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          onSubmitEditing={crearCuenta}
          error={clave2 && clave2.length >= clave.length && clave2 !== clave ? "No coincide con la contraseña." : undefined}
        />
        {verOcultar}
        {mensajes}
        <Boton titulo="Crear cuenta" bloque cargando={ocupado} onPress={crearCuenta} />
        <Texto v="fino" style={{ textAlign: "center" }}>
          Te enviaremos un correo para confirmar tu cuenta.
        </Texto>
        <Boton titulo="¿Ya tienes cuenta? Entra" tipo="enlace" onPress={() => ir("entrar")} style={{ alignSelf: "center" }} />
      </>
    );
  } else if (paso === "confirmar") {
    contenido = (
      <>
        <View style={estilos.sobre}>
          <Icono n="check" tam={30} tinta={color.acento} grosor={2.2} />
        </View>
        <Texto v="titulo">Confirma tu correo</Texto>
        <Texto>
          Te enviamos un correo a <Texto peso={600}>{correo}</Texto>. Ábrelo <Texto peso={600}>en este celular</Texto> y toca el enlace para activar tu
          cuenta: la app se abre y entras sola.
        </Texto>
        <Texto v="fino">Si lo abres en otro dispositivo, tu cuenta igual queda confirmada: vuelve aquí y entra con tu contraseña.</Texto>
        {mensajes}
        <Boton titulo="Ya lo confirmé, entrar" bloque onPress={() => ir("entrar")} />
        <Boton
          titulo={espera > 0 ? `Reenviar el correo en ${espera} s` : "Reenviar el correo"}
          tipo="enlace"
          deshabilitado={espera > 0 || ocupado}
          onPress={reenviarConfirmacion}
          style={{ alignSelf: "center" }}
        />
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
        {mensajes}
        <Boton titulo="Entrar con el código" bloque cargando={ocupado} deshabilitado={codigo.length < 6} onPress={verificarCodigo} />
        <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <Boton titulo={espera > 0 ? `Reenviar en ${espera} s` : "Reenviar el correo"} tipo="enlace" deshabilitado={espera > 0 || ocupado} onPress={enviarEnlace} />
          <Boton titulo="Volver" tipo="enlace" onPress={() => ir("entrar")} />
        </View>
      </>
    );
  } else if (paso === "enlace") {
    contenido = (
      <>
        <Texto v="titulo">Entrar con un enlace</Texto>
        <Texto v="fino">Para cuentas creadas antes, sin contraseña: te enviamos un enlace a tu correo.</Texto>
        <Campo
          etiqueta="Tu correo"
          value={correo}
          onChangeText={setCorreo}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          placeholder="nombre@correo.com"
          onSubmitEditing={enviarEnlace}
        />
        {mensajes}
        <Boton titulo="Enviarme el enlace" bloque cargando={ocupado} onPress={enviarEnlace} />
        <Boton titulo="Volver" tipo="enlace" onPress={() => ir("entrar")} style={{ alignSelf: "center" }} />
      </>
    );
  } else {
    contenido = (
      <>
        <Texto v="titulo">Entra a ENRENTA</Texto>
        <Campo
          etiqueta="Correo electrónico"
          value={correo}
          onChangeText={setCorreo}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          placeholder="nombre@correo.com"
        />
        <Campo
          etiqueta="Contraseña"
          value={clave}
          onChangeText={setClave}
          secureTextEntry={!verClave}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="current-password"
          textContentType="password"
          onSubmitEditing={entrar}
        />
        {verOcultar}
        {mensajes}
        <Boton titulo="Entrar" bloque cargando={ocupado} onPress={entrar} />
        <View style={estilos.separador}>
          <View style={estilos.linea} />
          <Texto v="fino">¿Eres nuevo?</Texto>
          <View style={estilos.linea} />
        </View>
        <Boton titulo="Crear cuenta" tipo="secundario" bloque onPress={() => ir("registro")} />
        <Boton titulo="¿Sin contraseña? Entra con un enlace" tipo="enlace" onPress={() => ir("enlace")} style={{ alignSelf: "center" }} />
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
  separador: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  linea: { flex: 1, height: 1, backgroundColor: color.linea },
  sobre: { width: 60, height: 60, borderRadius: 30, backgroundColor: color.acentoSuave, alignItems: "center", justifyContent: "center" },
});
