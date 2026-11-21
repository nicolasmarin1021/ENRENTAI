import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Avatar } from "@/componentes/perfil-cliente";
import { completitud, leerMiPerfil, type PerfilCliente } from "@/lib/perfil";
import { useSesion } from "@/lib/sesion";
import { miVerificacion, type MiVerificacion } from "@/lib/verificacion";
import { Boton, Encabezado, Pantalla, Tarjeta, Texto } from "@/ui/base";
import { Icono } from "@/ui/iconos";
import { Logo } from "@/ui/marca";
import { color } from "@/tema";

// Cuenta: quién eres y la información de la BETA. (El modo Necesito | Tengo va arriba a la derecha
// en todas las pestañas.)
export default function Cuenta() {
  const { usuario, nombre, compania, admin, salir } = useSesion();
  const [perfil, setPerfil] = useState<PerfilCliente | null>(null);
  const [verif, setVerif] = useState<MiVerificacion | null>(null);

  // Se vuelve a leer al entrar a la pestaña (por si acabas de editar tu perfil).
  useFocusEffect(
    useCallback(() => {
      if (!usuario) return;
      let vivo = true;
      void leerMiPerfil(usuario.id).then((r) => {
        if (vivo) setPerfil(r.perfil);
      });
      void miVerificacion(usuario.id, "cliente").then((r) => {
        if (vivo) setVerif(r);
      });
      return () => {
        vivo = false;
      };
    }, [usuario]),
  );

  const porcentaje = perfil ? completitud(perfil) : 0;
  const linea = perfil ? [perfil.ocupacion, perfil.empresa].filter(Boolean).join(" · ") : "";

  return (
    <Pantalla>
      <Encabezado titulo="Cuenta" />

      {usuario ? (
        <Pressable onPress={() => router.push("/perfil")} accessibilityRole="button" accessibilityLabel="Editar tu perfil" style={({ pressed }) => [pressed && { opacity: 0.85 }]}>
          <Tarjeta style={{ gap: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <Avatar nombre={perfil?.nombre || nombre || usuario.correo} foto={perfil?.foto ?? null} />
              <View style={{ flex: 1, gap: 2 }}>
                <Texto peso={600} style={{ fontSize: 17 }} numberOfLines={1}>
                  {perfil?.nombre || nombre || "Sin nombre"}
                </Texto>
                <Texto v="fino" numberOfLines={1}>
                  {linea || usuario.correo}
                </Texto>
                {compania ? (
                  <Texto v="fino" tono={color.acento} numberOfLines={1}>
                    {compania.nombre}
                    {compania.verificada ? " · verificada" : ""}
                  </Texto>
                ) : null}
              </View>
              <Icono n="flecha" tam={16} tinta={color.suave} />
            </View>
            {perfil && porcentaje < 100 ? (
              <View style={estilos.completar}>
                <View style={{ flex: 1, gap: 6 }}>
                  <Texto peso={600} style={{ fontSize: 14 }}>
                    Completa tu perfil · {porcentaje}%
                  </Texto>
                  <View style={estilos.barra}>
                    <View style={[estilos.barraLlena, { width: `${porcentaje}%` }]} />
                  </View>
                  <Texto v="fino">Con foto, a qué te dedicas y dónde trabajas, las compañías confían más en ti.</Texto>
                </View>
              </View>
            ) : null}
          </Tarjeta>
        </Pressable>
      ) : (
        <Tarjeta>
          <Texto>Entra o crea tu cuenta para pedir cotizaciones, ver tus solicitudes o publicar los equipos de tu compañía.</Texto>
          <Boton titulo="Entrar" onPress={() => router.push("/entrar")} />
        </Tarjeta>
      )}

      {/* Verificación de identidad (opcional) y, para los admins, la revisión. */}
      {usuario ? (
        <Tarjeta style={{ gap: 0, paddingVertical: 4 }}>
          <Opcion
            icono="escudo"
            texto="Verificar mi identidad"
            detalle={verif?.verificado ? "✓ Verificada" : verif?.ultima?.estado === "pendiente" ? "En revisión" : verif?.ultima?.estado === "rechazada" ? "Revisar" : undefined}
            tonoDetalle={verif?.verificado ? color.ok : verif?.ultima?.estado === "rechazada" ? color.mal : color.suave}
            onPress={() => router.push({ pathname: "/verificacion", params: { tipo: "cliente" } })}
            ultimo={!compania && !admin}
          />
          {compania ? (
            <Opcion
              icono="bodega"
              texto="Verificar mi compañía"
              detalle={compania.verificada ? "✓ Verificada" : undefined}
              tonoDetalle={color.ok}
              onPress={() => router.push({ pathname: "/verificacion", params: { tipo: "compania" } })}
              ultimo={!admin}
            />
          ) : null}
          {admin ? <Opcion icono="check" texto="Revisar verificaciones (admin)" onPress={() => router.push("/admin-verificaciones")} ultimo /> : null}
        </Tarjeta>
      ) : null}

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
  detalle,
  tonoDetalle = color.suave,
}: {
  icono: "info" | "salir" | "bodega" | "escudo" | "check";
  texto: string;
  onPress: () => void;
  peligro?: boolean;
  ultimo?: boolean;
  detalle?: string; // estado a la derecha ("✓ Verificada", "En revisión"…)
  tonoDetalle?: string;
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
      {detalle ? (
        <Texto v="fino" peso={600} tono={tonoDetalle}>
          {detalle}
        </Texto>
      ) : null}
      {!peligro ? <Icono n="flecha" tam={16} tinta={color.suave} /> : null}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  completar: { flexDirection: "row", gap: 12, backgroundColor: color.acentoSuave, borderRadius: 14, padding: 12 },
  barra: { height: 6, borderRadius: 3, backgroundColor: "#FFFFFF", overflow: "hidden" },
  barraLlena: { height: 6, borderRadius: 3, backgroundColor: color.acento },
  opcion: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 },
  opcionLinea: { borderBottomWidth: 1, borderBottomColor: color.linea },
});
