import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CamposEntrega, entregaAGuardar, validarEntrega, type DatosEntrega } from "@/componentes/entrega";
import { useSesion } from "@/lib/sesion";
import { supabase } from "@/lib/supabase";
import { normalizarWhatsApp, whatsappValido } from "@/lib/whatsapp";
import { ZONAS } from "@/lib/zonas";
import { Aviso, Boton, Campo, Chip, Tarjeta, Texto } from "@/ui/base";
import { color, margen } from "@/tema";

// Registro de la compañía (igual que web/src/components/registro-compania.tsx).
export default function Registro() {
  const { usuario, nombre, recargarPerfil, cambiarModo } = useSesion();
  const insets = useSafeAreaInsets();
  const [f, setF] = useState({
    nombre: "",
    nit: "",
    contacto: nombre,
    whatsapp: "",
    correo: usuario?.correo ?? "",
    direccion: "",
    zona: "",
    horario: "",
  });
  const [entrega, setEntrega] = useState<DatosEntrega>({ cobertura: "30", modo: "variable", fijo: "", base: "", km: "", tecnico: "", tarifaTecnico: "" });
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  function validar() {
    if (f.nombre.trim().length < 2) return "Escribe el nombre de la compañía.";
    if (f.contacto.trim().length < 2) return "Escribe el nombre de la persona de contacto.";
    if (!whatsappValido(normalizarWhatsApp(f.whatsapp))) return "Escribe el WhatsApp de la compañía (un celular de 10 dígitos, p. ej. 300 123 4567).";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.correo.trim())) return "Escribe un correo válido para la compañía.";
    if (f.direccion.trim().length < 6) return "Escribe la dirección exacta de la bodega.";
    if (!f.zona) return "Elige la zona donde está la bodega.";
    return validarEntrega(entrega);
  }

  async function registrar() {
    if (!usuario) return router.push("/entrar");
    const problema = validar();
    if (problema) return setError(problema);
    setOcupado(true);
    setError("");
    const z = ZONAS.find((x) => x.id === f.zona)!;
    const { data: c, error: e1 } = await supabase
      .from("companias")
      .insert({
        duenio: usuario.id,
        nombre: f.nombre.trim(),
        ciudad: z.municipio,
        zona: z.nombre,
        direccion_bodega: f.direccion.trim(),
        horario_bodega: f.horario.trim() || null,
        lat: z.lat,
        lng: z.lng,
        deposito_pct: 30, // se guarda para el modelo completo; la BETA no muestra depósito
        ...entregaAGuardar(entrega),
      })
      .select("id")
      .single();
    if (e1 || !c) {
      setOcupado(false);
      return setError("No pudimos crear la compañía. Revisa los datos e intenta de nuevo.");
    }
    const { error: e2 } = await supabase.from("companias_privado").insert({
      compania_id: c.id,
      contacto: f.contacto.trim(),
      telefono: f.whatsapp.trim(),
      whatsapp: normalizarWhatsApp(f.whatsapp),
      correo: f.correo.trim().toLowerCase(),
      nit: f.nit.trim() || null,
    });
    if (e2) {
      // Deshace el registro a medias para que se pueda volver a intentar.
      await supabase.from("companias").delete().eq("id", c.id);
      setOcupado(false);
      return setError("No pudimos guardar los datos de contacto. Intenta de nuevo.");
    }
    await recargarPerfil();
    setOcupado(false);
    cambiarModo("tengo");
    // Vuelve a las pestañas de compañía y abre el inventario para publicar el primer equipo.
    if (router.canGoBack()) router.back();
    router.navigate("/inventario");
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: color.fondo }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: margen, gap: 16, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic">
        <Texto v="fino" style={{ fontSize: 14.5 }}>
          Registra tu compañía para publicar tu inventario y recibir cotizaciones por WhatsApp. Gratis durante la BETA.
        </Texto>
        <Tarjeta>
          <Texto v="subtitulo">Tu compañía</Texto>
          <Campo etiqueta="Nombre de la compañía" value={f.nombre} onChangeText={set("nombre")} />
          <Campo etiqueta="NIT (opcional)" value={f.nit} onChangeText={set("nit")} keyboardType="numbers-and-punctuation" />
          <Campo etiqueta="Persona de contacto" value={f.contacto} onChangeText={set("contacto")} autoComplete="name" />
          <Campo etiqueta="WhatsApp para cotizaciones" keyboardType="phone-pad" placeholder="300 123 4567" value={f.whatsapp} onChangeText={set("whatsapp")} autoComplete="tel" />
          <Campo etiqueta="Correo de la compañía" keyboardType="email-address" autoCapitalize="none" value={f.correo} onChangeText={set("correo")} />
        </Tarjeta>
        <Tarjeta>
          <Texto v="subtitulo">Bodega</Texto>
          <Campo etiqueta="Dirección exacta" placeholder="Cra. 43A # 1-50" value={f.direccion} onChangeText={set("direccion")} />
          <Texto peso={500} style={{ fontSize: 14 }}>
            Zona
          </Texto>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {ZONAS.map((z) => (
              <Chip key={z.id} texto={z.nombre} activo={f.zona === z.id} onPress={() => setF((p) => ({ ...p, zona: z.id }))} />
            ))}
          </View>
          <Campo etiqueta="Horario (opcional)" placeholder="Lun a sáb, 8 a. m. – 6 p. m." value={f.horario} onChangeText={set("horario")} />
        </Tarjeta>
        <Tarjeta>
          <Texto v="subtitulo">Entregas y técnico</Texto>
          <CamposEntrega f={entrega} cambiar={(c) => setEntrega((p) => ({ ...p, ...c }))} />
        </Tarjeta>
        {error ? <Aviso tono="mal" texto={error} /> : null}
        <Boton titulo="Registrar mi compañía" bloque cargando={ocupado} onPress={registrar} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
