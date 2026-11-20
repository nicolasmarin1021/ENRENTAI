import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { urlFoto, useCatalogo, type CompaniaPublica, type EquipoPublico } from "@/lib/catalogo";
import { pesos, plural } from "@/lib/formato";
import { useGuardados } from "@/lib/guardados";
import { Boton, Encabezado, Pantalla, Tarjeta, Texto } from "@/ui/base";
import { Corazon } from "@/ui/corazon";
import { Icono, IconoCategoria } from "@/ui/iconos";
import { color, margen, radio } from "@/tema";

// Guardados (♡): los equipos y las compañías que la persona marcó, como las listas de Airbnb.
// El ♡ va al lado del botón de cada tarjeta (no dentro), para que cada toque haga una sola cosa.
export default function Guardados() {
  const { lista } = useGuardados();
  const { catalogo } = useCatalogo();
  const { width } = useWindowDimensions();
  const ancho = Math.floor((Math.min(width, 640) - margen * 2 - 12) / 2);

  const todos = catalogo.companias.flatMap((c) => c.equipos.map((e) => ({ e, c })));
  const equipos = lista.equipos
    .map((id) => todos.find((x) => x.e.id === id))
    .filter((x): x is { e: EquipoPublico; c: CompaniaPublica } => Boolean(x));
  const companias = lista.companias.map((id) => catalogo.companias.find((c) => c.id === id)).filter((c): c is CompaniaPublica => Boolean(c));
  const vacio = !equipos.length && !companias.length;

  return (
    <Pantalla>
      <Encabezado titulo="Guardados" sub={vacio ? undefined : "Lo que marcaste con ♡ para tus próximos shows."} />

      {vacio ? (
        <Tarjeta style={{ alignItems: "center", paddingVertical: 32, gap: 14 }}>
          <View style={estilos.vacioIcono}>
            <Icono n="corazon" tam={30} tinta={color.coral} />
          </View>
          <Texto v="subtitulo" style={{ textAlign: "center" }}>
            Aún no tienes guardados
          </Texto>
          <Texto v="fino" style={{ textAlign: "center", fontSize: 14.5 }}>
            Toca ♡ en un equipo o en una compañía para tenerlos a mano aquí cuando armes tu próximo rider.
          </Texto>
          <Boton titulo="Explorar equipos" onPress={() => router.navigate("/explorar")} />
        </Tarjeta>
      ) : null}

      {equipos.length ? (
        <>
          <Texto v="subtitulo">Equipos · {equipos.length}</Texto>
          <View style={estilos.rejilla}>
            {equipos.map(({ e, c }) => (
              <View key={e.id} style={{ width: ancho }}>
                <Pressable
                  onPress={() => router.push({ pathname: "/equipo/[id]", params: { id: e.id } })}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver ${e.nombre}`}
                  style={({ pressed }) => [{ gap: 6 }, pressed && { opacity: 0.8 }]}
                >
                  <View style={[estilos.foto, { width: ancho, height: ancho }]}>
                    {e.fotos[0] ? (
                      <Image source={{ uri: urlFoto(e.fotos[0]) }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
                    ) : (
                      <IconoCategoria cat={e.categoria_id} tam={40} tinta={color.suave} />
                    )}
                  </View>
                  <Texto peso={600} numberOfLines={2} style={{ fontSize: 14.5 }}>
                    {e.nombre}
                  </Texto>
                  <Texto v="fino" numberOfLines={1}>
                    {c.nombre}
                  </Texto>
                  <Texto style={{ fontSize: 14 }}>
                    <Texto peso={700} style={{ fontSize: 14 }}>
                      {pesos(e.precio_dia)}
                    </Texto>{" "}
                    / 24 h
                  </Texto>
                </Pressable>
                <View style={estilos.corazon}>
                  <Corazon tipo="equipos" id={e.id} nombre={e.nombre} tam={32} />
                </View>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {companias.length ? (
        <>
          <Texto v="subtitulo">Compañías · {companias.length}</Texto>
          {companias.map((c) => {
            const portada = c.equipos.find((e) => e.fotos[0])?.fotos[0];
            return (
              <View key={c.id} style={estilos.compania}>
                <Pressable
                  onPress={() => router.push({ pathname: "/compania/[id]", params: { id: c.id } })}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver ${c.nombre}`}
                  style={({ pressed }) => [estilos.companiaBoton, pressed && { opacity: 0.7 }]}
                >
                  <View style={estilos.miniatura}>
                    {portada ? (
                      <Image source={{ uri: urlFoto(portada) }} style={StyleSheet.absoluteFill} contentFit="cover" />
                    ) : (
                      <IconoCategoria cat="mic" tam={26} tinta={color.suave} />
                    )}
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Texto peso={600} numberOfLines={1}>
                      {c.nombre}
                    </Texto>
                    <Texto v="fino" numberOfLines={1}>
                      {c.resenas && c.resenas.total > 0 ? `★ ${c.resenas.promedio.toFixed(1).replace(".", ",")} · ` : ""}
                      {c.zona ?? c.ciudad} · {plural(c.equipos.length, "equipo", "equipos")}
                    </Texto>
                  </View>
                </Pressable>
                <Corazon tipo="companias" id={c.id} nombre={c.nombre} tam={34} plano />
              </View>
            );
          })}
        </>
      ) : null}
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  vacioIcono: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#FFEDE8", alignItems: "center", justifyContent: "center" },
  rejilla: { flexDirection: "row", flexWrap: "wrap", gap: 12, rowGap: 20 },
  foto: { borderRadius: radio.lg, overflow: "hidden", backgroundColor: color.superficie2, alignItems: "center", justifyContent: "center" },
  corazon: { position: "absolute", top: 8, right: 8 },
  compania: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: radio.lg,
    backgroundColor: color.superficie,
    shadowColor: "#101828",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  companiaBoton: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  miniatura: {
    width: 64,
    height: 64,
    borderRadius: radio.md,
    overflow: "hidden",
    backgroundColor: color.superficie2,
    alignItems: "center",
    justifyContent: "center",
  },
});
