import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NOVEDADES_FULL } from "@/lib/novedades";
import { Etiqueta, Tarjeta, Texto } from "@/ui/base";
import { color, margen, radio } from "@/tema";

// Cómo funciona la BETA (mismo texto de web/src/app/como-funciona/page.tsx) y lo que viene.
function Pasos({ items }: { items: [string, string][] }) {
  return (
    <View style={{ gap: 12 }}>
      {items.map(([titulo, texto], i) => (
        <View key={titulo} style={estilos.paso}>
          <View style={estilos.num}>
            <Texto peso={700} tono={color.acento} style={{ fontSize: 14 }}>
              {i + 1}
            </Texto>
          </View>
          <Texto style={{ flex: 1 }}>
            <Texto peso={600}>{titulo}</Texto> {texto}
          </Texto>
        </View>
      ))}
    </View>
  );
}

export default function ComoFunciona() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={{ backgroundColor: color.fondo }} contentContainerStyle={{ padding: margen, gap: 16, paddingBottom: insets.bottom + 32 }} contentInsetAdjustmentBehavior="automatic">
      <Etiqueta texto="BETA" tono="acento" />
      <Texto>
        ENRENTA conecta a quien necesita equipos de audio y RF para un show con las compañías que los rentan en Medellín. Durante la BETA, el
        precio final y el pago se acuerdan directamente entre las dos partes por WhatsApp.
      </Texto>

      <Tarjeta>
        <Texto v="subtitulo">Si necesitas equipos</Texto>
        <Pasos
          items={[
            ["Busca y arma tu rider.", "Elige qué necesitas, las fechas y el lugar del show. Verás las compañías con unidades libres y sus precios de referencia."],
            ["Pide la cotización por WhatsApp.", "Con un toque se abre WhatsApp con tu rider, fechas y lugar ya escritos para cada compañía."],
            ["Acuerda con la compañía.", "Precio final, forma de pago, horarios de entrega y recogida."],
            ["Queda apartado.", "Cuando la compañía marca tu solicitud como rentada, el equipo queda reservado para ti. Síguela en Solicitudes."],
          ]}
        />
      </Tarjeta>

      <Tarjeta>
        <Texto v="subtitulo">Si tienes equipos</Texto>
        <Pasos
          items={[
            ["Registra tu compañía y tu WhatsApp.", "Ahí te llegan las cotizaciones."],
            ["Publica tu inventario", "con fotos, unidades y precio por día, y define tus tarifas de transporte y técnico."],
            ["Responde por WhatsApp", "y, cuando cierres el trato, marca la solicitud como rentada para apartar el equipo. Si no se concreta, márcala así."],
          ]}
        />
      </Tarjeta>

      <Tarjeta>
        <Texto v="subtitulo">Condiciones de la BETA</Texto>
        {[
          ["ENRENTA no cobra ni recibe pagos.", "El alquiler y cualquier garantía que pida la compañía se acuerdan y se pagan directamente entre el cliente y la compañía."],
          ["ENRENTA no es parte del contrato de alquiler.", "Las condiciones (precio, horarios, estado del equipo, daños y faltantes) las acuerdan el cliente y la compañía."],
          ["Los precios que ves son de referencia.", "Los publica cada compañía y pueden cambiar en la cotización final."],
          ["Tus datos.", "El WhatsApp de una compañía solo se le entrega a quien le pide una cotización. Cuando escribes por WhatsApp, la compañía ve tu número."],
          ["Gratis durante la BETA", "para clientes y compañías."],
        ].map(([t, x]) => (
          <Texto key={t}>
            <Texto peso={600}>{t}</Texto> {x}
          </Texto>
        ))}
        <Texto v="fino">Condiciones provisionales mientras dure la BETA. Los términos completos se publicarán antes del lanzamiento.</Texto>
      </Tarjeta>

      <Tarjeta style={{ backgroundColor: color.tinta }}>
        <Etiqueta texto="Próximamente" tono="mal" />
        <Texto v="subtitulo" tono="#FFFFFF">
          Lo que viene en ENRENTA completa
        </Texto>
        {NOVEDADES_FULL.map((n) => (
          <View key={n.titulo} style={estilos.novedad}>
            <Texto peso={600} tono="#FFFFFF">
              {n.titulo}
            </Texto>
            <Texto v="fino" tono="rgba(255,255,255,0.72)">
              {n.texto}
            </Texto>
          </View>
        ))}
      </Tarjeta>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  paso: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  num: { width: 28, height: 28, borderRadius: 14, backgroundColor: color.acentoSuave, alignItems: "center", justifyContent: "center" },
  novedad: { gap: 2, padding: 12, borderRadius: radio.md, backgroundColor: "rgba(255,255,255,0.07)" },
});
