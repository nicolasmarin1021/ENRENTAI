import * as Crypto from "expo-crypto";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { prepararFoto, type FotoLista } from "@/lib/fotos";
import { fechaCO } from "@/lib/formato";
import { useSesion } from "@/lib/sesion";
import { mensajeError, supabase } from "@/lib/supabase";
import { miVerificacion, type MiVerificacion, type TipoVerificacion } from "@/lib/verificacion";
import { Aviso, Boton, Campo, Cargando, Tarjeta, Texto } from "@/ui/base";
import { Icono } from "@/ui/iconos";
import { color, margen, radio } from "@/tema";

type Pieza = { id: string; titulo: string; ayuda: string; selfie?: boolean };

// Lo que se pide en cada caso (en este orden quedan en la revisión del admin).
const PIEZAS: Record<TipoVerificacion, Pieza[]> = {
  cliente: [
    { id: "frente", titulo: "Cédula · frente", ayuda: "Con tu foto y el número a la vista, sin reflejos." },
    { id: "reverso", titulo: "Cédula · reverso", ayuda: "Con la huella y el código de barras." },
    { id: "selfie", titulo: "Selfie con tu cédula", ayuda: "Tu cara y la cédula junto a ella, con buena luz.", selfie: true },
  ],
  compania: [
    { id: "documento", titulo: "RUT o certificado de Cámara de Comercio", ayuda: "La página donde se ven el NIT y la razón social." },
    { id: "representante", titulo: "Cédula del representante legal · frente", ayuda: "Con la foto y el número a la vista." },
  ],
};

const FALTA_SQL = "Falta ejecutar el SQL 0012_verificacion_identidad.sql en Supabase.";

// Verificación de identidad (opcional): el cliente envía su cédula y una selfie; la compañía, su
// NIT, el RUT o certificado de Cámara de Comercio y la cédula del representante. Un admin lo revisa
// a mano, y al terminar se borran las fotos y queda la insignia de verificado.
export default function Verificacion() {
  const { tipo: t } = useLocalSearchParams<{ tipo?: string }>();
  const tipo: TipoVerificacion = t === "compania" ? "compania" : "cliente";
  const { usuario, compania } = useSesion();
  const [estado, setEstado] = useState<MiVerificacion | null>(null);
  const [version, setVersion] = useState(0);
  const companiaVerificada = compania?.verificada ?? false;

  useEffect(() => {
    if (!usuario) return;
    let vivo = true;
    void miVerificacion(usuario.id, tipo, companiaVerificada).then((r) => {
      if (vivo) setEstado(r);
    });
    return () => {
      vivo = false;
    };
  }, [usuario, tipo, companiaVerificada, version]);

  if (!usuario) {
    return (
      <View style={{ flex: 1, padding: margen, gap: 12, backgroundColor: color.fondo }}>
        <Texto>Entra con tu correo para verificar tu identidad.</Texto>
        <Boton titulo="Entrar" onPress={() => router.replace("/entrar")} />
      </View>
    );
  }
  if (tipo === "compania" && !compania) {
    return (
      <View style={{ flex: 1, padding: margen, gap: 12, backgroundColor: color.fondo }}>
        <Texto>Primero registra tu compañía para poder verificarla.</Texto>
        <Boton titulo="Registrar compañía" onPress={() => router.replace("/registro")} />
      </View>
    );
  }
  if (!estado) return <Cargando texto="Revisando tu verificación…" />;
  return <VistaVerificacion tipo={tipo} uid={usuario.id} estado={estado} onEnviada={() => setVersion((v) => v + 1)} />;
}

// Solo dibuja y envía (el estado lo trae Verificacion).
export function VistaVerificacion({
  tipo,
  uid,
  estado,
  onEnviada,
}: {
  tipo: TipoVerificacion;
  uid: string;
  estado: MiVerificacion;
  onEnviada: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [fotos, setFotos] = useState<Record<string, FotoLista>>({});
  const [preparando, setPreparando] = useState<string | null>(null);
  const [nit, setNit] = useState("");
  const [acepto, setAcepto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const piezas = PIEZAS[tipo];
  const ultima = estado.ultima;
  const enRevision = ultima?.estado === "pendiente";
  const puedeEnviar = !estado.verificado && !enRevision && !estado.faltaSql;
  const sujeto = tipo === "cliente" ? "tu identidad" : "tu compañía";

  async function elegir(p: Pieza, origen: "camara" | "galeria") {
    setError("");
    if (origen === "camara") {
      const permiso = await ImagePicker.requestCameraPermissionsAsync();
      if (!permiso.granted) return setError("Para tomar la foto, permite el uso de la cámara en los ajustes del celular.");
    }
    const opciones: ImagePicker.ImagePickerOptions = {
      mediaTypes: ["images"],
      quality: 1,
      cameraType: p.selfie ? ImagePicker.CameraType.front : ImagePicker.CameraType.back,
    };
    const r = origen === "camara" ? await ImagePicker.launchCameraAsync(opciones) : await ImagePicker.launchImageLibraryAsync(opciones);
    if (r.canceled || !r.assets[0]) return;
    setPreparando(p.id);
    try {
      const lista = await prepararFoto(r.assets[0], 1800);
      setFotos((f) => ({ ...f, [p.id]: lista }));
    } catch {
      setError("No pudimos abrir esa foto. Intenta con otra.");
    } finally {
      setPreparando(null);
    }
  }

  async function enviar() {
    const falta = piezas.find((p) => !fotos[p.id]);
    if (falta) return setError(`Falta la foto: ${falta.titulo}.`);
    if (tipo === "compania" && nit.replace(/\D/g, "").length < 8) return setError("Escribe el NIT de la compañía con el dígito de verificación.");
    if (!acepto) return setError("Para enviar, autoriza el tratamiento de tus datos.");
    setEnviando(true);
    setError("");
    const subidas: string[] = [];
    try {
      for (const p of piezas) {
        const ruta = `${uid}/${Crypto.randomUUID()}.jpg`;
        const { error: e } = await supabase.storage.from("verificaciones").upload(ruta, fotos[p.id].datos, { contentType: "image/jpeg", upsert: false });
        if (e) throw { code: /bucket/i.test(e.message) ? "SIN_BUCKET" : "SUBIDA", message: e.message };
        subidas.push(ruta);
      }
      const { error: e } = await supabase.rpc("solicitar_verificacion", {
        p_tipo: tipo,
        p_archivos: subidas,
        p_nit: tipo === "compania" ? nit.trim() : null,
        p_acepto: true,
      });
      if (e) throw e;
      setFotos({});
      setAcepto(false);
      onEnviada();
    } catch (e) {
      // Si algo falla, no deja fotos sueltas en el bucket.
      if (subidas.length) await supabase.storage.from("verificaciones").remove(subidas);
      const err = e as { code?: string; message?: string };
      setError(
        err.code === "SIN_BUCKET" || err.code === "PGRST202"
          ? FALTA_SQL
          : err.code === "SUBIDA"
            ? "No pudimos subir las fotos. Revisa tu conexión e intenta de nuevo."
            : mensajeError(err, "No pudimos enviar la verificación. Intenta de nuevo."),
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: color.fondo }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: margen, gap: 16, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic">
        {/* Qué es y para qué sirve */}
        <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
          <View style={estilos.escudo}>
            <Icono n="escudo" tam={28} tinta={color.acento} grosor={2} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Texto peso={700} style={{ fontSize: 20, lineHeight: 25 }}>
              {tipo === "cliente" ? "Verifica tu identidad" : "Verifica tu compañía"}
            </Texto>
            <Texto v="fino" style={{ fontSize: 14 }}>
              {tipo === "cliente"
                ? "Las compañías verán la insignia «Identidad verificada» cuando les pidas equipo."
                : "Los clientes verán el sello «Verificada» en tu compañía, en el mapa y en tu perfil."}
            </Texto>
          </View>
        </View>

        {estado.faltaSql ? <Aviso tono="aviso" texto={FALTA_SQL} /> : null}

        {/* En qué va */}
        {estado.verificado ? (
          <Aviso tono="ok" texto={tipo === "cliente" ? "✓ Tu identidad está verificada." : "✓ Tu compañía tiene el sello Verificada."} />
        ) : enRevision && ultima ? (
          <Aviso tono="acento" texto={`Enviada el ${fechaCO(ultima.creado)}. Un admin de ENRENTA la está revisando; aquí verás el resultado.`} />
        ) : ultima?.estado === "rechazada" ? (
          <Aviso tono="mal" texto={`No pudimos verificar ${sujeto}: ${ultima.motivo ?? "revisa las fotos"}. Corrige y envíala de nuevo.`} />
        ) : null}

        {puedeEnviar ? (
          <>
            <Tarjeta style={{ gap: 10 }}>
              <Texto peso={600}>Cómo funciona</Texto>
              <Paso n={1} texto={tipo === "cliente" ? "Toma las fotos de tu cédula y una selfie con ella." : "Escribe el NIT y toma las fotos de los documentos."} />
              <Paso
                n={2}
                texto={
                  tipo === "cliente"
                    ? "Un admin de ENRENTA las revisa y consulta tu cédula en la Registraduría."
                    : "Un admin de ENRENTA las revisa y consulta el NIT en el RUES."
                }
              />
              <Paso n={3} texto="Recibes la insignia y borramos las fotos. Es opcional: puedes usar ENRENTA sin verificarte." />
            </Tarjeta>

            {tipo === "compania" ? (
              <Campo
                etiqueta="NIT de la compañía"
                placeholder="900123456-7"
                keyboardType="numbers-and-punctuation"
                value={nit}
                onChangeText={(v) => {
                  setNit(v.replace(/[^0-9-]/g, "").slice(0, 14));
                  setError("");
                }}
              />
            ) : null}

            {piezas.map((p) => (
              <RanuraFoto key={p.id} p={p} foto={fotos[p.id] ?? null} preparando={preparando === p.id} onElegir={(o) => elegir(p, o)} />
            ))}

            {/* Autorización de datos (Ley 1581 de 2012) */}
            <Pressable
              onPress={() => {
                setAcepto(!acepto);
                setError("");
              }}
              style={estilos.acepto}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: acepto }}
            >
              <View style={[estilos.casilla, acepto && estilos.casillaLlena]}>{acepto ? <Icono n="check" tam={15} tinta="#FFFFFF" grosor={2.6} /> : null}</View>
              <Texto v="fino" tono={color.tinta} style={{ flex: 1, lineHeight: 19 }}>
                {tipo === "cliente"
                  ? "Autorizo a ENRENTA a usar mis datos y estas fotos, incluida la selfie (un dato biométrico, sensible), solo para verificar mi identidad. Las fotos se borran cuando termina la revisión (Ley 1581 de 2012)."
                  : "Autorizo a ENRENTA a usar estos documentos y datos solo para verificar mi compañía. Las fotos se borran cuando termina la revisión (Ley 1581 de 2012)."}
              </Texto>
            </Pressable>

            {error ? <Aviso tono="mal" texto={error} /> : null}
            <Boton titulo="Enviar a revisión" bloque cargando={enviando} deshabilitado={!!preparando} onPress={enviar} />
          </>
        ) : error ? (
          <Aviso tono="mal" texto={error} />
        ) : null}

        <Pressable onPress={() => router.back()} style={{ alignSelf: "center", padding: 8 }} accessibilityRole="button">
          <Texto peso={600} tono={color.acento}>
            Volver
          </Texto>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Paso({ n, texto }: { n: number; texto: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
      <View style={estilos.numero}>
        <Texto peso={700} tono={color.acento} style={{ fontSize: 12.5 }}>
          {n}
        </Texto>
      </View>
      <Texto v="fino" tono={color.tinta} style={{ flex: 1, lineHeight: 19 }}>
        {texto}
      </Texto>
    </View>
  );
}

// Un espacio para una foto: vacío (con cámara y galería) o con la foto elegida.
function RanuraFoto({
  p,
  foto,
  preparando,
  onElegir,
}: {
  p: Pieza;
  foto: FotoLista | null;
  preparando: boolean;
  onElegir: (origen: "camara" | "galeria") => void;
}) {
  const nativo = Platform.OS !== "web";
  return (
    <View style={[estilos.ranura, foto && estilos.ranuraLista]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Texto peso={600} style={{ flex: 1 }}>
          {p.titulo}
        </Texto>
        {foto ? <Icono n="check" tam={18} tinta={color.ok} grosor={2.4} /> : null}
      </View>
      {foto ? (
        <Image source={{ uri: foto.uri }} style={estilos.vista} contentFit="cover" />
      ) : (
        <Texto v="fino">{p.ayuda}</Texto>
      )}
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        {nativo ? (
          <Boton
            titulo={foto ? "Tomar otra" : p.selfie ? "Tomar selfie" : "Tomar foto"}
            tipo="suave"
            chico
            cargando={preparando}
            icono={<Icono n="camara" tam={17} tinta={color.acento} />}
            onPress={() => onElegir("camara")}
          />
        ) : null}
        <Boton
          titulo={foto && !nativo ? "Cambiar" : "Galería"}
          tipo="suave"
          chico
          deshabilitado={preparando}
          icono={<Icono n="foto" tam={17} tinta={color.acento} />}
          onPress={() => onElegir("galeria")}
        />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  escudo: { width: 56, height: 56, borderRadius: 28, backgroundColor: color.acentoSuave, alignItems: "center", justifyContent: "center" },
  numero: { width: 22, height: 22, borderRadius: 11, backgroundColor: color.acentoSuave, alignItems: "center", justifyContent: "center", marginTop: -1 },
  ranura: { gap: 10, padding: 14, borderRadius: radio.lg, borderWidth: 1.5, borderStyle: "dashed", borderColor: color.lineaFuerte, backgroundColor: color.superficie },
  ranuraLista: { borderStyle: "solid", borderColor: color.linea },
  vista: { width: "100%", height: 180, borderRadius: radio.md, backgroundColor: color.superficie2 },
  acepto: { flexDirection: "row", gap: 12, alignItems: "flex-start", padding: 14, borderRadius: radio.lg, backgroundColor: color.superficie2 },
  casilla: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: color.lineaFuerte, backgroundColor: color.superficie, alignItems: "center", justifyContent: "center", marginTop: 1 },
  casillaLlena: { backgroundColor: color.acento, borderColor: color.acento },
});
