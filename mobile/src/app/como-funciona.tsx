import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { VieneCompleta } from "@/componentes/inicio/viene";
import { useSesion } from "@/lib/sesion";
import { Boton, Tarjeta, Texto } from "@/ui/base";
import { Icono, IconoCategoria } from "@/ui/iconos";
import { Aparece } from "@/ui/movimiento";
import { color, fuente, margen, radio } from "@/tema";

// Cómo funciona la BETA (el mismo orden de web/src/app/como-funciona/page.tsx): dos recorridos con
// pasos numerados, las condiciones en tarjetas y el adelanto de ENRENTA completa.

const CLIENTE: [string, string][] = [
  ["Arma tu rider", "Elige qué necesitas, las fechas y el lugar del show. El mapa te muestra las compañías con equipo libre."],
  ["Cotiza por WhatsApp", "Con un toque se abre WhatsApp con tu rider, fechas y lugar ya escritos."],
  ["Acuerda con la compañía", "Precio final, forma de pago, entrega y recogida."],
  ["Queda apartado", "Cuando la compañía marca tu solicitud como rentada, el equipo queda reservado para ti."],
];
const COMPANIA: [string, string][] = [
  ["Registra tu compañía", "Con tu WhatsApp, que es donde te llegan las cotizaciones."],
  ["Publica tu inventario", "Fotos, unidades y precio por día, más tus tarifas de transporte y técnico."],
  ["Responde y aparta", "Cuando cierres el trato, marca la solicitud como rentada para apartar el equipo en tu agenda."],
];
const CONDICIONES: { ico: "escudo" | "info" | "buscar" | "chat"; t: string; x: string }[] = [
  { ico: "escudo", t: "ENRENTA no cobra ni recibe pagos", x: "El alquiler y cualquier garantía se acuerdan y se pagan directamente entre cliente y compañía." },
  { ico: "info", t: "No somos parte del contrato", x: "Precio, horarios, estado del equipo, daños y faltantes los acuerdan cliente y compañía." },
  { ico: "buscar", t: "Los precios son de referencia", x: "Los publica cada compañía y pueden cambiar en la cotización final." },
  { ico: "chat", t: "Tus datos", x: "El WhatsApp de una compañía solo se entrega a quien le pide cotización, y ella ve tu número. Usamos tus datos solo para que ENRENTA funcione." },
];

function Pasos({ items }: { items: [string, string][] }) {
  return (
    <View>
      {items.map(([titulo, texto], i) => (
        <Aparece key={titulo} retraso={120 + i * 80} desde="izquierda" style={[e.paso, i === items.length - 1 && { paddingBottom: 0 }]}>
          {i < items.length - 1 ? <View style={e.unir} /> : null}
          <View style={e.num}>
            <Text style={e.numTexto}>{i + 1}</Text>
          </View>
          <View style={{ flex: 1, gap: 2, paddingTop: 5 }}>
            <Texto peso={600} style={{ fontSize: 16 }}>
              {titulo}
            </Texto>
            <Texto v="fino" style={{ fontSize: 14.5, lineHeight: 20 }}>
              {texto}
            </Texto>
          </View>
        </Aparece>
      ))}
    </View>
  );
}

export default function ComoFunciona() {
  const insets = useSafeAreaInsets();
  const { cambiarModo } = useSesion();
  // Lleva a la primera pestaña del modo elegido (como la pantalla de inicio).
  const ir = (m: "necesito" | "tengo") => {
    cambiarModo(m);
    router.navigate(m === "tengo" ? "/panel" : "/buscar");
  };
  return (
    <ScrollView
      style={{ backgroundColor: color.fondo }}
      contentContainerStyle={{ padding: margen, gap: 18, paddingBottom: insets.bottom + 32 }}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Aparece retraso={0} style={{ gap: 12 }}>
        <Text style={e.titulo}>
          Cómo funciona <Text style={{ color: color.acento }}>ENRENTA</Text>
        </Text>
        <Texto style={{ fontSize: 16.5, lineHeight: 24 }} tono={color.suave}>
          Conectamos a quien necesita equipos para un show con las compañías que los rentan en Medellín.
        </Texto>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <View style={e.clave}>
            <Icono n="check" tam={14} tinta={color.ok} grosor={2.6} />
            <Texto peso={500} style={{ fontSize: 13.5 }}>
              Gratis durante la BETA
            </Texto>
          </View>
          <View style={e.clave}>
            <Icono n="chat" tam={14} tinta={color.whatsapp} />
            <Texto peso={500} style={{ fontSize: 13.5 }}>
              Precio y pago por WhatsApp
            </Texto>
          </View>
        </View>
      </Aparece>

      <Tarjeta style={[e.panel, { backgroundColor: "#F3F5FD" }]}>
        <View style={e.panelCab}>
          <View style={[e.chipo, { backgroundColor: color.acento }]}>
            <IconoCategoria cat="mic" tam={18} tinta="#FFFFFF" />
          </View>
          <Texto v="subtitulo" style={{ fontSize: 20 }}>
            Si necesitas equipos
          </Texto>
        </View>
        <Pasos items={CLIENTE} />
        <Boton titulo="Buscar equipos" bloque onPress={() => ir("necesito")} />
      </Tarjeta>

      <Tarjeta style={e.panel}>
        <View style={e.panelCab}>
          <View style={e.chipo}>
            <Icono n="bodega" tam={18} tinta={color.acento} />
          </View>
          <Texto v="subtitulo" style={{ fontSize: 20 }}>
            Si tienes equipos
          </Texto>
        </View>
        <Pasos items={COMPANIA} />
        <Boton titulo="Publicar mi inventario" tipo="secundario" bloque onPress={() => ir("tengo")} />
      </Tarjeta>

      <Texto v="subtitulo" style={{ fontSize: 21, marginTop: 6 }}>
        Condiciones de la BETA
      </Texto>
      {CONDICIONES.map((c) => (
        <Tarjeta key={c.t} style={{ gap: 6 }}>
          <View style={e.reglaIco}>
            <Icono n={c.ico} tam={19} tinta={color.acento} grosor={1.7} />
          </View>
          <Texto peso={600} style={{ fontSize: 15.5 }}>
            {c.t}
          </Texto>
          <Texto v="fino" style={{ fontSize: 14, lineHeight: 20 }}>
            {c.x}
          </Texto>
        </Tarjeta>
      ))}
      <Texto v="fino">
        Son provisionales mientras dure la BETA. Los términos completos y la política de tratamiento de datos personales se publicarán antes del
        lanzamiento.
      </Texto>

      <VieneCompleta />
    </ScrollView>
  );
}

const e = StyleSheet.create({
  titulo: { fontFamily: fuente[600], fontSize: 32, lineHeight: 36, letterSpacing: -1, color: color.tinta },
  clave: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radio.pildora,
    backgroundColor: color.superficie,
    borderWidth: 1,
    borderColor: color.linea,
  },
  panel: { gap: 18, padding: 20, borderRadius: 24 },
  panelCab: { flexDirection: "row", alignItems: "center", gap: 12 },
  chipo: { width: 38, height: 38, borderRadius: 12, backgroundColor: color.acentoSuave, alignItems: "center", justifyContent: "center" },
  paso: { flexDirection: "row", gap: 14, paddingBottom: 18 },
  unir: { position: "absolute", left: 16, top: 36, bottom: 2, width: 2, borderRadius: 1, backgroundColor: color.lineaFuerte },
  num: { width: 34, height: 34, borderRadius: 17, backgroundColor: color.acentoSuave, alignItems: "center", justifyContent: "center" },
  numTexto: { fontFamily: fuente[700], fontSize: 14, color: color.acento },
  reglaIco: { width: 38, height: 38, borderRadius: 12, backgroundColor: color.acentoSuave, alignItems: "center", justifyContent: "center", marginBottom: 4 },
});
