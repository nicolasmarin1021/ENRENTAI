import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fechaCO } from "@/lib/formato";
import { useSesion } from "@/lib/sesion";
import { mensajeError, supabase } from "@/lib/supabase";
import { CONSULTA_CEDULA, CONSULTA_NIT, MOTIVOS_RECHAZO, urlsFirmadas, verificacionesPendientes, type Pendiente } from "@/lib/verificacion";
import { Aviso, Boton, Campo, Cargando, Chip, Etiqueta, Tarjeta, Texto } from "@/ui/base";
import { Icono } from "@/ui/iconos";
import { color, margen, radio } from "@/tema";

const NOMBRES_FOTOS: Record<Pendiente["tipo"], string[]> = {
  cliente: ["Cédula · frente", "Cédula · reverso", "Selfie con la cédula"],
  compania: ["RUT o certificado de Cámara de Comercio", "Cédula del representante legal"],
};

// Solo para admins (perfiles.es_admin): las verificaciones de identidad por revisar. El admin mira
// las fotos, consulta la cédula en la Registraduría (o el NIT en el RUES) y aprueba o rechaza con
// un motivo. Al terminar, las fotos se borran del bucket privado.
export default function AdminVerificaciones() {
  const { admin } = useSesion();
  const insets = useSafeAreaInsets();
  const [lista, setLista] = useState<Pendiente[] | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!admin) return;
    let vivo = true;
    void verificacionesPendientes().then((r) => {
      if (!vivo) return;
      setLista(r.lista);
      setError(r.error);
      setCargando(false);
    });
    return () => {
      vivo = false;
    };
  }, [admin, version]);

  if (!admin) {
    return (
      <View style={{ flex: 1, padding: margen, backgroundColor: color.fondo }}>
        <Texto>Esta pantalla es solo para los administradores de ENRENTA.</Texto>
      </View>
    );
  }

  const recargar = () => {
    setCargando(true);
    setVersion((v) => v + 1);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: color.fondo }}
      contentContainerStyle={{ padding: margen, gap: 16, paddingBottom: insets.bottom + 40 }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={cargando} onRefresh={recargar} tintColor={color.acento} />}
    >
      <Texto v="fino" style={{ fontSize: 14 }}>
        Revisa que las fotos se vean bien, que la selfie coincida con la cédula y consulta el documento antes de aprobar. Al aprobar o
        rechazar, las fotos se borran.
      </Texto>
      {error ? <Aviso tono="mal" texto={error} /> : null}
      {lista === null ? (
        <Cargando texto="Cargando verificaciones…" />
      ) : lista.length ? (
        lista.map((v) => <TarjetaPendiente key={v.id} v={v} onListo={recargar} />)
      ) : (
        <View style={estilos.vacio}>
          <Icono n="check" tam={26} tinta={color.ok} grosor={2.2} />
          <Texto v="fino" style={{ textAlign: "center" }}>
            No hay verificaciones por revisar.
          </Texto>
        </View>
      )}
    </ScrollView>
  );
}

export function TarjetaPendiente({ v, onListo }: { v: Pendiente; onListo: () => void }) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [rechazando, setRechazando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  const clave = v.archivos.join(",");

  // Enlaces temporales para ver las fotos privadas.
  useEffect(() => {
    let vivo = true;
    void urlsFirmadas(clave ? clave.split(",") : []).then((m) => {
      if (vivo) setUrls(m);
    });
    return () => {
      vivo = false;
    };
  }, [clave]);

  async function resolver(aprobar: boolean) {
    if (!aprobar && motivo.trim().length < 4) return setError("Escribe o elige el motivo del rechazo.");
    setOcupado(true);
    setError("");
    const { error: e } = await supabase.rpc("revisar_verificacion", { p_id: v.id, p_aprobar: aprobar, p_motivo: aprobar ? null : motivo.trim() });
    if (e) {
      setOcupado(false);
      return setError(mensajeError(e, "No pudimos guardar la revisión. Intenta de nuevo."));
    }
    // Ya no se necesitan: se borran las fotos.
    if (v.archivos.length) await supabase.storage.from("verificaciones").remove(v.archivos);
    setOcupado(false);
    onListo();
  }

  return (
    <Tarjeta style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Etiqueta texto={v.tipo === "cliente" ? "Cliente" : "Compañía"} tono={v.tipo === "cliente" ? "acento" : "aviso"} />
        <View style={{ flex: 1 }} />
        <Texto v="fino">{fechaCO(v.creado)}</Texto>
      </View>
      <View style={{ gap: 2 }}>
        <Texto peso={600} style={{ fontSize: 17 }}>
          {v.tipo === "compania" && v.compania ? v.compania : v.nombre || "Sin nombre"}
        </Texto>
        {v.tipo === "compania" ? <Texto v="fino">Dueño: {v.nombre || "sin nombre"}</Texto> : null}
        {v.correo ? <Texto v="fino">{v.correo}</Texto> : null}
        {v.nit ? (
          <Texto peso={600} style={{ fontSize: 15 }}>
            NIT {v.nit}
          </Texto>
        ) : null}
      </View>

      {v.archivos.map((ruta, i) => (
        <View key={ruta} style={{ gap: 6 }}>
          <Texto v="etiqueta">{NOMBRES_FOTOS[v.tipo][i] ?? `Foto ${i + 1}`}</Texto>
          <Pressable
            onPress={() => (urls[ruta] ? Linking.openURL(urls[ruta]).catch(() => {}) : undefined)}
            accessibilityRole="imagebutton"
            accessibilityLabel={`Ampliar: ${NOMBRES_FOTOS[v.tipo][i] ?? "foto"}`}
            style={estilos.foto}
          >
            {urls[ruta] ? (
              <Image source={{ uri: urls[ruta] }} style={StyleSheet.absoluteFill} contentFit="contain" transition={150} />
            ) : (
              <Icono n="foto" tam={28} tinta={color.suave} />
            )}
          </Pressable>
        </View>
      ))}
      <Texto v="fino">Toca una foto para verla en grande.</Texto>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Boton titulo="Consultar cédula (Registraduría)" tipo="secundario" chico onPress={() => Linking.openURL(CONSULTA_CEDULA).catch(() => {})} />
        {v.tipo === "compania" ? <Boton titulo="Consultar NIT (RUES)" tipo="secundario" chico onPress={() => Linking.openURL(CONSULTA_NIT).catch(() => {})} /> : null}
      </View>

      {rechazando ? (
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {MOTIVOS_RECHAZO.filter((m) => v.tipo === "compania" || !m.includes("NIT")).map((m) => (
              <Chip key={m} texto={m} activo={motivo === m} onPress={() => setMotivo(m)} />
            ))}
          </View>
          <Campo etiqueta="Motivo (lo verá la persona)" value={motivo} onChangeText={(t) => setMotivo(t.slice(0, 300))} multiline />
          {error ? <Aviso tono="mal" texto={error} /> : null}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Boton titulo="Confirmar rechazo" tipo="peligro" cargando={ocupado} onPress={() => resolver(false)} />
            <Boton titulo="Volver" tipo="enlace" onPress={() => setRechazando(false)} style={{ alignSelf: "center" }} />
          </View>
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          {error ? <Aviso tono="mal" texto={error} /> : null}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Boton titulo="Rechazar" tipo="secundario" deshabilitado={ocupado} onPress={() => setRechazando(true)} style={{ flex: 1 }} />
            <Boton titulo="Aprobar" cargando={ocupado} onPress={() => resolver(true)} style={{ flex: 1 }} />
          </View>
        </View>
      )}
    </Tarjeta>
  );
}

const estilos = StyleSheet.create({
  foto: { height: 230, borderRadius: radio.md, backgroundColor: color.superficie2, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  vacio: { alignItems: "center", gap: 8, padding: 24, borderRadius: radio.lg, borderWidth: 1, borderStyle: "dashed", borderColor: color.lineaFuerte },
});
