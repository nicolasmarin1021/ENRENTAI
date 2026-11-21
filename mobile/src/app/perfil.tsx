import * as Crypto from "expo-crypto";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MisCalificaciones } from "@/componentes/calificar-cliente";
import { Avatar, TarjetaPerfil } from "@/componentes/perfil-cliente";
import { prepararFoto } from "@/lib/fotos";
import { completitud, leerMiPerfil, MAX_DESCRIPCION, OCUPACIONES, type PerfilCliente } from "@/lib/perfil";
import { useSesion } from "@/lib/sesion";
import { supabase } from "@/lib/supabase";
import { miVerificacion, type MiVerificacion } from "@/lib/verificacion";
import { Aviso, Boton, Campo, Cargando, Chip, Tarjeta, Texto } from "@/ui/base";
import { Icono } from "@/ui/iconos";
import { color, margen } from "@/tema";

// Tu perfil (el de quien pide equipos): foto, a qué te dedicas, dónde trabajas y una descripción
// breve. Es lo que ven las compañías cuando les pides una cotización.
export default function Perfil() {
  const { usuario, recargarPerfil } = useSesion();
  const insets = useSafeAreaInsets();
  const [p, setP] = useState<PerfilCliente | null>(null);
  const [faltaSql, setFaltaSql] = useState(false);
  const [fotoNueva, setFotoNueva] = useState<{ uri: string; datos: ArrayBuffer } | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [listo, setListo] = useState(false);
  const [verif, setVerif] = useState<MiVerificacion | null>(null);

  useEffect(() => {
    if (!usuario) return;
    void leerMiPerfil(usuario.id).then((r) => {
      setP(r.perfil);
      setFaltaSql(r.faltaSql);
    });
    void miVerificacion(usuario.id, "cliente").then(setVerif);
  }, [usuario]);

  if (!usuario) {
    return (
      <View style={{ flex: 1, padding: margen, gap: 12, backgroundColor: color.fondo }}>
        <Texto>Entra con tu correo para completar tu perfil.</Texto>
        <Boton titulo="Entrar" onPress={() => router.replace("/entrar")} />
      </View>
    );
  }
  if (!p) return <Cargando texto="Cargando tu perfil…" />;

  const cambiar = (c: Partial<PerfilCliente>) => {
    setP((x) => (x ? { ...x, ...c } : x));
    setListo(false);
    setError("");
  };

  async function elegirFoto(origen: "camara" | "galeria") {
    setError("");
    if (origen === "camara") {
      const permiso = await ImagePicker.requestCameraPermissionsAsync();
      if (!permiso.granted) return setError("Para tomar la foto, permite el uso de la cámara en los ajustes del iPhone.");
    }
    const opciones: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 1 };
    const r = origen === "camara" ? await ImagePicker.launchCameraAsync(opciones) : await ImagePicker.launchImageLibraryAsync(opciones);
    if (r.canceled || !r.assets[0]) return;
    setSubiendo(true);
    try {
      const lista = await prepararFoto(r.assets[0], 600);
      setFotoNueva({ uri: lista.uri, datos: lista.datos });
      setListo(false);
    } catch {
      setError("No pudimos abrir esa foto. Intenta con otra.");
    } finally {
      setSubiendo(false);
    }
  }

  async function guardar() {
    if (!p || !usuario) return;
    const nombre = p.nombre.trim().replace(/\s+/g, " ");
    if (nombre.length < 2) return setError("Escribe tu nombre.");
    setGuardando(true);
    setError("");
    let foto = p.foto;
    if (fotoNueva) {
      const ruta = `${usuario.id}/${Crypto.randomUUID()}.jpg`;
      const { error: e1 } = await supabase.storage.from("avatares").upload(ruta, fotoNueva.datos, { contentType: "image/jpeg", upsert: false });
      if (e1) {
        setGuardando(false);
        return setError(faltaSql ? "Falta ejecutar el SQL 0010_perfil_cliente.sql en Supabase." : "No pudimos subir tu foto. Intenta de nuevo.");
      }
      if (p.foto) await supabase.storage.from("avatares").remove([p.foto]);
      foto = ruta;
    }
    const { error: e2 } = await supabase
      .from("perfiles")
      .update({
        nombre: nombre.slice(0, 120),
        ocupacion: p.ocupacion,
        empresa: p.empresa?.trim() || null,
        descripcion: p.descripcion?.trim() || null,
        ciudad: p.ciudad.trim() || "Medellín",
        enlace: p.enlace?.trim() || null,
        foto,
      })
      .eq("id", usuario.id);
    setGuardando(false);
    if (e2) {
      return setError(
        e2.code === "42703" || e2.code === "PGRST204"
          ? "Falta ejecutar el SQL 0010_perfil_cliente.sql en Supabase para guardar el perfil completo."
          : "No pudimos guardar tu perfil. Revisa tu conexión e intenta de nuevo.",
      );
    }
    setP({ ...p, nombre, foto });
    setFotoNueva(null);
    setListo(true);
    void recargarPerfil();
  }

  const vista: PerfilCliente = { ...p, foto: fotoNueva ? null : p.foto, identidad_verificada: verif?.verificado ?? false };
  const porcentaje = completitud({ ...p, foto: fotoNueva ? "nueva" : p.foto });

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: color.fondo }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: margen, gap: 16, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic">
        <Texto v="fino" style={{ fontSize: 14.5 }}>
          Es lo que ven las compañías cuando les pides una cotización. Un perfil completo les ayuda a confiar en ti.
        </Texto>
        {faltaSql ? <Aviso tono="aviso" texto="Para guardar el perfil completo falta ejecutar el SQL 0010_perfil_cliente.sql en Supabase." /> : null}

        {/* Qué tan completo va */}
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Texto v="etiqueta">Tu perfil</Texto>
            <Texto v="fino" peso={600} tono={porcentaje === 100 ? color.ok : color.acento}>
              {porcentaje}% completo
            </Texto>
          </View>
          <View style={estilos.barra}>
            <View style={[estilos.barraLlena, { width: `${porcentaje}%`, backgroundColor: porcentaje === 100 ? color.ok : color.acento }]} />
          </View>
        </View>

        {/* Verificación de identidad (opcional): da la insignia que ven las compañías. */}
        {verif && !verif.faltaSql ? (
          <Pressable
            onPress={() => router.push({ pathname: "/verificacion", params: { tipo: "cliente" } })}
            style={({ pressed }) => [estilos.verificar, verif.verificado && { backgroundColor: color.okSuave }, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
          >
            <Icono n="escudo" tam={22} tinta={verif.verificado ? color.ok : color.acento} grosor={2} />
            <View style={{ flex: 1, gap: 2 }}>
              <Texto peso={600} style={{ fontSize: 15 }}>
                {verif.verificado ? "Identidad verificada" : verif.ultima?.estado === "pendiente" ? "Verificación en revisión" : "Verifica tu identidad"}
              </Texto>
              <Texto v="fino">
                {verif.verificado
                  ? "Las compañías ven la insignia en tus solicitudes."
                  : verif.ultima?.estado === "pendiente"
                    ? "Un admin de ENRENTA está revisando tus fotos."
                    : verif.ultima?.estado === "rechazada"
                      ? `No se pudo verificar: ${verif.ultima.motivo ?? "revisa las fotos"}. Toca para enviarla de nuevo.`
                      : "Opcional: con tu cédula y una selfie ganas la insignia de verificado."}
              </Texto>
            </View>
            <Icono n="flecha" tam={16} tinta={color.suave} />
          </Pressable>
        ) : null}

        {/* Foto */}
        <Tarjeta style={{ alignItems: "center", gap: 12 }}>
          <View>
            {fotoNueva ? (
              <View style={estilos.fotoNueva}>
                <AvatarLocal uri={fotoNueva.uri} />
              </View>
            ) : (
              <Avatar nombre={p.nombre} foto={p.foto} tam={96} />
            )}
          </View>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            {Platform.OS !== "web" ? (
              <Boton titulo="Tomar foto" tipo="suave" chico icono={<Icono n="camara" tam={17} tinta={color.acento} />} cargando={subiendo} onPress={() => elegirFoto("camara")} />
            ) : null}
            <Boton titulo="Elegir de la galería" tipo="suave" chico icono={<Icono n="foto" tam={17} tinta={color.acento} />} deshabilitado={subiendo} onPress={() => elegirFoto("galeria")} />
          </View>
        </Tarjeta>

        <Tarjeta>
          <Campo etiqueta="Tu nombre" value={p.nombre} onChangeText={(v) => cambiar({ nombre: v })} autoComplete="name" />
          <Texto peso={500} style={{ fontSize: 14 }}>
            ¿A qué te dedicas?
          </Texto>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {OCUPACIONES.map((o) => (
              <Chip key={o} texto={o} activo={p.ocupacion === o} onPress={() => cambiar({ ocupacion: p.ocupacion === o ? null : o })} />
            ))}
          </View>
          <Campo
            etiqueta="¿Dónde trabajas?"
            placeholder="Productora, empresa, banda o teatro"
            value={p.empresa ?? ""}
            onChangeText={(v) => cambiar({ empresa: v.slice(0, 100) })}
          />
          <Campo etiqueta="Ciudad" value={p.ciudad} onChangeText={(v) => cambiar({ ciudad: v.slice(0, 60) })} />
          <Campo
            etiqueta="Sobre ti"
            placeholder="Ej.: Ingeniera de monitores con 8 años en festivales. Cuido el equipo como si fuera mío."
            multiline
            value={p.descripcion ?? ""}
            onChangeText={(v) => cambiar({ descripcion: v.slice(0, MAX_DESCRIPCION) })}
            ayuda={`${(p.descripcion ?? "").length} / ${MAX_DESCRIPCION}`}
          />
          <Campo
            etiqueta="Instagram o sitio web (opcional)"
            placeholder="@tuusuario o tusitio.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            value={p.enlace ?? ""}
            onChangeText={(v) => cambiar({ enlace: v.slice(0, 200) })}
          />
        </Tarjeta>

        {/* Vista previa */}
        <View style={{ gap: 8 }}>
          <Texto v="etiqueta">Así te ven las compañías</Texto>
          <Tarjeta>
            {fotoNueva ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <AvatarLocal uri={fotoNueva.uri} tam={28} />
                <Texto v="fino">Tu foto nueva se verá al guardar.</Texto>
              </View>
            ) : null}
            <TarjetaPerfil p={vista} />
          </Tarjeta>
        </View>

        {error ? <Aviso tono="mal" texto={error} /> : null}
        {listo ? <Aviso tono="ok" texto="Listo: tu perfil quedó guardado." /> : null}
        <Boton titulo="Guardar perfil" bloque cargando={guardando} deshabilitado={subiendo} onPress={guardar} />

        {/* Lo que dicen de ti las compañías a las que les has rentado (con tu respuesta) */}
        <MisCalificaciones uid={usuario.id} />

        <Pressable onPress={() => router.back()} style={{ alignSelf: "center", padding: 8 }} accessibilityRole="button">
          <Texto peso={600} tono={color.acento}>
            Volver
          </Texto>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Vista previa de una foto recién elegida (todavía en el celular).
function AvatarLocal({ uri, tam = 96 }: { uri: string; tam?: number }) {
  return <Image source={{ uri }} style={{ width: tam, height: tam, borderRadius: tam / 2 }} contentFit="cover" />;
}

const estilos = StyleSheet.create({
  barra: { height: 6, borderRadius: 3, backgroundColor: color.lineaFuerte, overflow: "hidden" },
  barraLlena: { height: 6, borderRadius: 3 },
  fotoNueva: { borderRadius: 48, overflow: "hidden" },
  verificar: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, backgroundColor: color.acentoSuave },
});
