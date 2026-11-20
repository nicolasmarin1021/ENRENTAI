import * as Crypto from "expo-crypto";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CATEGORIAS_RF, ESTADOS_EQUIPO, MAX_FOTOS, urlFoto, useCatalogo, type EstadoEquipo } from "@/lib/catalogo";
import { conPuntos, soloNumero } from "@/lib/formato";
import { prepararFoto } from "@/lib/fotos";
import { useSesion } from "@/lib/sesion";
import { supabase } from "@/lib/supabase";
import { Aviso, Boton, Campo, Cargando, Chip, Tarjeta, Texto } from "@/ui/base";
import { Icono } from "@/ui/iconos";
import { color, margen, radio } from "@/tema";

type Foto =
  | { tipo: "guardada"; id: string; ruta: string; orden: number }
  | { tipo: "nueva"; clave: string; uri: string; datos: ArrayBuffer };

type Form = {
  nombre: string;
  categoria: string;
  incluye: string;
  unidades: string;
  precio: string;
  dimensiones: string;
  peso: string;
  estado: EstadoEquipo;
  banda: string;
  desde: string;
  hasta: string;
  activo: boolean;
};

const FORM_VACIO: Form = {
  nombre: "",
  categoria: "",
  incluye: "",
  unidades: "1",
  precio: "",
  dimensiones: "",
  peso: "",
  estado: "excelente",
  banda: "",
  desde: "",
  hasta: "",
  activo: true,
};

const decimal = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));

function preguntar(titulo: string, texto: string, accion: string, si: () => void) {
  if (Platform.OS === "web") {
    if (window.confirm(`${titulo}\n\n${texto}`)) si();
    return;
  }
  Alert.alert(titulo, texto, [
    { text: "Cancelar", style: "cancel" },
    { text: accion, style: "destructive", onPress: si },
  ]);
}

// Agregar o editar un equipo del inventario (con fotos de la cámara o de la galería).
// Guarda igual que la web (web/src/components/form-equipo.tsx).
export default function EditarEquipo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const nuevo = id === "nuevo";
  const { compania } = useSesion();
  const { catalogo, recargar } = useCatalogo();
  const insets = useSafeAreaInsets();
  const [f, setF] = useState<Form>(FORM_VACIO);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [quitadas, setQuitadas] = useState<{ id: string; ruta: string }[]>([]);
  const [cargando, setCargando] = useState(!nuevo);
  const [preparando, setPreparando] = useState(false);
  const [estado, setEstado] = useState(""); // "Guardando…", "Subiendo fotos…"
  const [error, setError] = useState("");
  const esRF = CATEGORIAS_RF.has(f.categoria);
  const ocupado = estado !== "";
  const cambiar = (c: Partial<Form>) => setF((p) => ({ ...p, ...c }));

  useEffect(() => {
    if (nuevo || !id) return;
    supabase
      .from("equipos")
      .select("id, categoria_id, nombre, incluye, unidades, precio_dia, dimensiones, peso_kg, estado, banda_nombre, banda_min_mhz, banda_max_mhz, activo, equipo_fotos(id, ruta, orden)")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const e = data as unknown as {
            categoria_id: string; nombre: string; incluye: string | null; unidades: number; precio_dia: number;
            dimensiones: string | null; peso_kg: number | null; estado: EstadoEquipo; banda_nombre: string | null;
            banda_min_mhz: number | null; banda_max_mhz: number | null; activo: boolean;
            equipo_fotos: { id: string; ruta: string; orden: number }[];
          };
          setF({
            nombre: e.nombre,
            categoria: e.categoria_id,
            incluye: e.incluye ?? "",
            unidades: String(e.unidades),
            precio: conPuntos(Math.round(Number(e.precio_dia))),
            dimensiones: e.dimensiones ?? "",
            peso: e.peso_kg != null ? String(e.peso_kg).replace(".", ",") : "",
            estado: e.estado,
            banda: e.banda_nombre ?? "",
            desde: e.banda_min_mhz != null ? String(e.banda_min_mhz) : "",
            hasta: e.banda_max_mhz != null ? String(e.banda_max_mhz) : "",
            activo: e.activo,
          });
          setFotos([...e.equipo_fotos].sort((a, b) => a.orden - b.orden).map((x) => ({ tipo: "guardada" as const, ...x })));
        } else setError("No encontramos este equipo.");
        setCargando(false);
      });
  }, [id, nuevo]);

  async function agregarFotos(origen: "camara" | "galeria") {
    const libres = MAX_FOTOS - fotos.length;
    if (libres <= 0) return setError(`Puedes subir hasta ${MAX_FOTOS} fotos por equipo.`);
    setError("");
    if (origen === "camara") {
      const permiso = await ImagePicker.requestCameraPermissionsAsync();
      if (!permiso.granted) return setError("Para tomar fotos, permite el uso de la cámara en los ajustes del iPhone.");
    }
    const opciones: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 1 };
    const r =
      origen === "camara"
        ? await ImagePicker.launchCameraAsync(opciones)
        : await ImagePicker.launchImageLibraryAsync({ ...opciones, allowsMultipleSelection: true, selectionLimit: libres });
    if (r.canceled || !r.assets.length) return;
    setPreparando(true);
    const listas: Foto[] = [];
    let fallidas = 0;
    for (const a of r.assets.slice(0, libres)) {
      try {
        const p = await prepararFoto(a);
        listas.push({ tipo: "nueva", clave: Crypto.randomUUID(), uri: p.uri, datos: p.datos });
      } catch {
        fallidas++;
      }
    }
    setFotos((p) => [...p, ...listas].slice(0, MAX_FOTOS));
    setPreparando(false);
    if (fallidas) setError(`No pudimos abrir ${fallidas === 1 ? "una foto" : `${fallidas} fotos`}. Intenta con otras.`);
  }

  function quitarFoto(i: number) {
    const x = fotos[i];
    if (x.tipo === "guardada") setQuitadas((p) => [...p, { id: x.id, ruta: x.ruta }]);
    setFotos((p) => p.filter((_, j) => j !== i));
  }
  const hacerPortada = (i: number) => setFotos((p) => [p[i], ...p.filter((_, j) => j !== i)]);

  function validar() {
    if (f.nombre.trim().length < 2) return "Escribe la marca y el modelo del equipo.";
    if (!f.categoria) return "Elige la categoría del equipo.";
    const u = Number(f.unidades);
    if (!Number.isInteger(u) || u < 1 || u > 9999) return "Las unidades deben ser un número entero entre 1 y 9.999.";
    if (soloNumero(f.precio) < 1000) return "Escribe el precio por 24 horas (mínimo $1.000).";
    const peso = decimal(f.peso);
    if (peso !== null && (!Number.isFinite(peso) || peso < 0 || peso > 99999)) return "Revisa el peso: escribe solo el número en kg.";
    if (esRF && (f.desde || f.hasta)) {
      const lo = decimal(f.desde);
      const hi = decimal(f.hasta);
      if (lo === null || hi === null || !Number.isFinite(lo) || !Number.isFinite(hi)) return "Para la banda RF escribe desde y hasta en MHz, o deja ambos vacíos.";
      if (lo <= 0 || hi > 9999 || lo >= hi) return "Revisa la banda RF: “desde” debe ser menor que “hasta” (en MHz).";
    }
    return "";
  }

  async function guardar() {
    if (!compania) return;
    const problema = validar();
    if (problema) return setError(problema);
    setError("");
    setEstado("Guardando el equipo…");
    const equipoId = nuevo ? Crypto.randomUUID() : id!;
    const rf = esRF && f.desde && f.hasta;
    const fila = {
      categoria_id: f.categoria,
      nombre: f.nombre.trim().replace(/\s+/g, " "),
      incluye: f.incluye.trim() || null,
      unidades: Number(f.unidades),
      precio_dia: soloNumero(f.precio),
      dimensiones: f.dimensiones.trim() || null,
      peso_kg: decimal(f.peso),
      estado: f.estado,
      banda_nombre: esRF ? f.banda.trim() || null : null,
      banda_min_mhz: rf ? decimal(f.desde) : null,
      banda_max_mhz: rf ? decimal(f.hasta) : null,
      activo: f.activo,
    };
    try {
      const { error: e1 } = nuevo
        ? await supabase.from("equipos").insert({ id: equipoId, compania_id: compania.id, ...fila })
        : await supabase.from("equipos").update(fila).eq("id", equipoId);
      if (e1) throw new Error("equipo");

      if (quitadas.length) {
        setEstado("Quitando fotos…");
        await supabase.storage.from("equipos").remove(quitadas.map((q) => q.ruta));
        await supabase.from("equipo_fotos").delete().in("id", quitadas.map((q) => q.id));
      }
      const nuevas = fotos.filter((x) => x.tipo === "nueva").length;
      if (nuevas) setEstado(`Subiendo ${nuevas === 1 ? "1 foto" : `${nuevas} fotos`}…`);
      const resultados = await Promise.all(
        fotos.map(async (x, orden) => {
          if (x.tipo === "guardada") {
            if (x.orden !== orden) await supabase.from("equipo_fotos").update({ orden }).eq("id", x.id);
            return null;
          }
          const ruta = `${compania.id}/${equipoId}/${Crypto.randomUUID()}.jpg`;
          const { error: e2 } = await supabase.storage
            .from("equipos")
            .upload(ruta, x.datos, { contentType: "image/jpeg", cacheControl: "31536000", upsert: false });
          if (e2) throw new Error("foto");
          return { equipo_id: equipoId, ruta, orden };
        }),
      );
      const filasFotos = resultados.filter((r) => r !== null);
      if (filasFotos.length) {
        const { error: e3 } = await supabase.from("equipo_fotos").insert(filasFotos);
        if (e3) throw new Error("foto");
      }
    } catch (e) {
      setEstado("");
      return setError(
        e instanceof Error && e.message === "foto"
          ? "El equipo se guardó, pero algunas fotos no subieron. Ábrelo de nuevo y vuelve a agregarlas."
          : "No pudimos guardar el equipo. Revisa tu conexión e intenta de nuevo.",
      );
    }
    setEstado("");
    void recargar(); // el catálogo de Explorar también cambia
    router.back();
  }

  function borrar() {
    preguntar("¿Eliminar este equipo?", "Se borra con sus fotos. Esto no se puede deshacer.", "Eliminar", async () => {
      setEstado("Eliminando…");
      const rutas = fotos.filter((x) => x.tipo === "guardada").map((x) => (x as { ruta: string }).ruta).concat(quitadas.map((q) => q.ruta));
      if (rutas.length) await supabase.storage.from("equipos").remove(rutas);
      const { error: e } = await supabase.from("equipos").delete().eq("id", id!);
      setEstado("");
      if (e) return setError("No pudimos eliminarlo. Si tiene solicitudes, ponlo en pausa en lugar de eliminarlo.");
      void recargar();
      router.back();
    });
  }

  if (cargando) return <Cargando texto="Cargando el equipo…" />;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: color.fondo }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Stack.Screen options={{ title: nuevo ? "Nuevo equipo" : "Editar equipo" }} />
      <ScrollView contentContainerStyle={{ padding: margen, gap: 16, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic">
        <Tarjeta>
          <Texto v="subtitulo">Fotos</Texto>
          <Texto v="fino">Hasta {MAX_FOTOS}. La primera es la portada; toca otra para ponerla de portada.</Texto>
          <View style={estilos.fotos}>
            {fotos.map((x, i) => (
              <View key={x.tipo === "guardada" ? x.id : x.clave} style={[estilos.foto, i === 0 && estilos.portada]}>
                <Pressable onPress={() => hacerPortada(i)} style={StyleSheet.absoluteFill} accessibilityLabel={i === 0 ? "Portada" : "Poner de portada"}>
                  <Image source={{ uri: x.tipo === "guardada" ? urlFoto(x.ruta) : x.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                </Pressable>
                <Pressable onPress={() => quitarFoto(i)} style={estilos.quitar} accessibilityRole="button" accessibilityLabel="Quitar foto" hitSlop={6}>
                  <Icono n="cerrar" tam={13} />
                </Pressable>
                {i === 0 ? (
                  <View style={estilos.sello}>
                    <Texto style={{ fontSize: 10.5, color: "#FFFFFF" }} peso={600}>
                      PORTADA
                    </Texto>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
          {fotos.length < MAX_FOTOS ? (
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              {Platform.OS !== "web" ? (
                <Boton titulo="Tomar foto" tipo="suave" chico icono={<Icono n="camara" tam={17} tinta={color.acento} />} cargando={preparando} onPress={() => agregarFotos("camara")} />
              ) : null}
              <Boton titulo="Elegir de la galería" tipo="suave" chico icono={<Icono n="foto" tam={17} tinta={color.acento} />} deshabilitado={preparando} onPress={() => agregarFotos("galeria")} />
            </View>
          ) : null}
        </Tarjeta>

        <Tarjeta>
          <Campo etiqueta="Marca y modelo" placeholder="Ej.: Shure Axient Digital AD2" value={f.nombre} onChangeText={(v) => cambiar({ nombre: v })} />
          <Texto peso={500} style={{ fontSize: 14 }}>
            Categoría
          </Texto>
          <View style={estilos.chips}>
            {catalogo.categorias.map((c) => (
              <Chip key={c.id} texto={c.nombre} activo={f.categoria === c.id} onPress={() => cambiar({ categoria: c.id })} />
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Campo etiqueta="Unidades" keyboardType="number-pad" value={f.unidades} onChangeText={(v) => cambiar({ unidades: v.replace(/\D/g, "").slice(0, 4) })} style={{ flex: 1 }} />
            <Campo etiqueta="Precio por 24 h" keyboardType="number-pad" placeholder="150.000" value={f.precio} onChangeText={(v) => cambiar({ precio: conPuntos(v) })} style={{ flex: 1.4 }} />
          </View>
          <Texto peso={500} style={{ fontSize: 14 }}>
            Estado
          </Texto>
          <View style={estilos.chips}>
            {ESTADOS_EQUIPO.map((e) => (
              <Chip key={e.id} texto={e.nombre} activo={f.estado === e.id} onPress={() => cambiar({ estado: e.id })} />
            ))}
          </View>
          <Campo etiqueta="Qué incluye (opcional)" multiline placeholder="Ej.: receptor, 2 micrófonos de mano, antenas y estuche" value={f.incluye} onChangeText={(v) => cambiar({ incluye: v })} />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Campo etiqueta="Dimensiones (opcional)" placeholder="48 × 30 × 15 cm" value={f.dimensiones} onChangeText={(v) => cambiar({ dimensiones: v })} style={{ flex: 1.4 }} />
            <Campo etiqueta="Peso kg" keyboardType="decimal-pad" value={f.peso} onChangeText={(v) => cambiar({ peso: v })} style={{ flex: 1 }} />
          </View>
          {esRF ? (
            <>
              <Campo etiqueta="Banda RF (opcional)" placeholder="Ej.: G57" value={f.banda} onChangeText={(v) => cambiar({ banda: v })} />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Campo etiqueta="Desde (MHz)" keyboardType="decimal-pad" value={f.desde} onChangeText={(v) => cambiar({ desde: v })} style={{ flex: 1 }} />
                <Campo etiqueta="Hasta (MHz)" keyboardType="decimal-pad" value={f.hasta} onChangeText={(v) => cambiar({ hasta: v })} style={{ flex: 1 }} />
              </View>
            </>
          ) : null}
          <View style={estilos.switch}>
            <View style={{ flex: 1 }}>
              <Texto peso={500}>Publicado</Texto>
              <Texto v="fino">{f.activo ? "Los clientes lo ven en Explorar." : "En pausa: no se muestra a los clientes."}</Texto>
            </View>
            <Switch value={f.activo} onValueChange={(v) => cambiar({ activo: v })} trackColor={{ true: color.acento, false: color.lineaFuerte }} />
          </View>
        </Tarjeta>

        {error ? <Aviso tono="mal" texto={error} /> : null}
        <Boton titulo={estado || (nuevo ? "Publicar equipo" : "Guardar cambios")} bloque cargando={ocupado} deshabilitado={preparando} onPress={guardar} />
        {!nuevo ? <Boton titulo="Eliminar equipo" tipo="peligro" bloque deshabilitado={ocupado} onPress={borrar} /> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  fotos: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  foto: { width: 96, height: 96, borderRadius: radio.sm, overflow: "hidden", backgroundColor: color.superficie2 },
  portada: { borderWidth: 2, borderColor: color.acento },
  quitar: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  sello: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "rgba(59,91,219,0.9)", paddingVertical: 2, alignItems: "center" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  switch: { flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: 1, borderTopColor: color.linea, paddingTop: 12 },
});
