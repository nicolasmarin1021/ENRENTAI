import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { iniciales } from "@/lib/formato";
import { useSesion, type Modo } from "@/lib/sesion";
import { Boton, Encabezado, Pantalla, Segmentos, Tarjeta, Texto } from "@/ui/base";
import { Icono } from "@/ui/iconos";
import { Logo } from "@/ui/marca";
import { color, fuente } from "@/tema";

// Cuenta: quién eres, en qué modo usas la app (cliente o compañía) y la información de la BETA.
export default function Cuenta() {
  const { usuario, nombre, compania, modo, cambiarModo, salir } = useSesion();

  function elegirModo(m: Modo) {
    cambiarModo(m);
    router.replace(m === "tengo" ? "/panel" : "/explorar");
  }

  return (
    <Pantalla>
      <Encabezado titulo="Cuenta" />

      {usuario ? (
        <Tarjeta style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View style={estilos.avatar}>
            <Texto style={estilos.avatarTexto}>{iniciales(nombre || usuario.correo)}</Texto>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Texto peso={600} style={{ fontSize: 17 }}>
              {nombre || "Sin nombre"}
            </Texto>
            <Texto v="fino" numberOfLines={1}>
              {usuario.correo}
            </Texto>
            {compania ? (
              <Texto v="fino" tono={color.acento}>
                {compania.nombre}
                {compania.verificada ? " · verificada" : ""}
              </Texto>
            ) : null}
          </View>
        </Tarjeta>
      ) : (
        <Tarjeta>
          <Texto>Entra con tu correo para pedir cotizaciones, ver tus solicitudes o publicar los equipos de tu compañía.</Texto>
          <Boton titulo="Entrar" onPress={() => router.push("/entrar")} />
        </Tarjeta>
      )}

      <Tarjeta>
        <Texto v="etiqueta">Usar ENRENTA como</Texto>
        <Segmentos
          opciones={[
            { id: "necesito", texto: "Necesito equipos" },
            { id: "tengo", texto: "Tengo equipos" },
          ]}
          valor={modo}
          onCambio={elegirModo}
        />
        <Texto v="fino">
          {modo === "necesito"
            ? "Buscas equipos para un show, armas tu rider y pides la cotización por WhatsApp."
            : "Publicas los equipos de tu compañía, recibes cotizaciones por WhatsApp y marcas lo que rentaste."}
        </Texto>
      </Tarjeta>

      <Tarjeta style={{ gap: 0, paddingVertical: 4 }}>
        <Opcion icono="bodega" texto="Pantalla de inicio" onPress={() => router.push("/bienvenida")} />
        <Opcion icono="info" texto="Cómo funciona la BETA" onPress={() => router.push("/como-funciona")} />
        {usuario ? <Opcion icono="salir" texto="Salir de mi cuenta" peligro onPress={() => void salir()} ultimo /> : null}
      </Tarjeta>

      <View style={{ alignItems: "center", gap: 6, paddingTop: 8 }}>
        <Logo alto={18} />
        <Texto v="fino">BETA · Medellín, Colombia · gratis durante la BETA</Texto>
      </View>
    </Pantalla>
  );
}

function Opcion({
  icono,
  texto,
  onPress,
  peligro = false,
  ultimo = false,
}: {
  icono: "info" | "salir" | "bodega";
  texto: string;
  onPress: () => void;
  peligro?: boolean;
  ultimo?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [estilos.opcion, !ultimo && estilos.opcionLinea, pressed && { opacity: 0.6 }]}
    >
      <Icono n={icono} tinta={peligro ? color.mal : color.acento} />
      <Texto peso={500} tono={peligro ? color.mal : color.tinta} style={{ flex: 1 }}>
        {texto}
      </Texto>
      {!peligro ? <Icono n="flecha" tam={16} tinta={color.suave} /> : null}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: color.acento, alignItems: "center", justifyContent: "center" },
  avatarTexto: { color: "#FFFFFF", fontFamily: fuente[600], fontSize: 18 },
  opcion: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 },
  opcionLinea: { borderBottomWidth: 1, borderBottomColor: color.linea },
});
