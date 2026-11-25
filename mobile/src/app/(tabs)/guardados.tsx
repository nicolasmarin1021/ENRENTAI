import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { urlFoto, useCatalogo, type CompaniaPublica, type EquipoPublico } from "@/lib/catalogo";
import { pesos } from "@/lib/formato";
import { useGuardados } from "@/lib/guardados";
import { Aviso, Boton, Encabezado, Pantalla, Tarjeta, Texto } from "@/ui/base";
import { Corazon } from "@/ui/corazon";
import { Icono, IconoCategoria } from "@/ui/iconos";
import { color, margen, radio } from "@/tema";

// Guardados (♡): los equipos que la persona quiere rentar, como las listas de Airbnb.
// El ♡ va al lado del botón de cada tarjeta (no dentro), para que cada toque haga una sola cosa.
export default function Guardados() {
  const { equipos: ids, alternar } = useGuardados();
  const { catalogo, cargando } = useCatalogo();
  const { width } = useWindowDimensions();
  const ancho = Math.floor((Math.min(width, 640) - margen * 2 - 12) / 2);

  const todos = catalogo.companias.flatMap((c) => c.equipos.map((e) => ({ e, c })));
  const equipos = ids
    .map((id) => todos.find((x) => x.e.id === id))
    .filter((x): x is { e: EquipoPublico; c: CompaniaPublica } => Boolean(x));
  // Lo que se guardó y ya no está publicado (la compañía lo pausó o lo quitó).
  const perdidos = cargando || !todos.length ? [] : ids.filter((id) => !todos.some((x) => x.e.id === id));
  const vacio = !equipos.length;

  return (
    <Pantalla>
      <Encabezado titulo="Futuras rentas" sub={vacio ? undefined : "Los equipos que marcaste con ♡ para tus próximos shows."} />

      {vacio ? (
        <Tarjeta style={{ alignItems: "center", paddingVertical: 32, gap: 14 }}>
          <View style={estilos.vacioIcono}>
            <Icono n="corazon" tam={30} tinta={color.coral} />
          </View>
          <Texto v="subtitulo" style={{ textAlign: "center" }}>
            Aún no tienes guardados
          </Texto>
          <Texto v="fino" style={{ textAlign: "center", fontSize: 14.5 }}>
            Toca ♡ en un equipo que te interese rentar para tenerlo a mano aquí cuando armes tu próximo rider.
          </Texto>
          <Boton
            titulo="Explorar equipos"
            onPress={() => router.navigate({ pathname: "/buscar", params: { vista: "explorar", n: String(Date.now()) } })}
          />
        </Tarjeta>
      ) : null}

      {perdidos.length ? (
        <Aviso
          tono="aviso"
          texto={perdidos.length === 1 ? "Un equipo que guardaste ya no está publicado." : `${perdidos.length} equipos que guardaste ya no están publicados.`}
        >
          <Boton titulo="Quitarlos de Guardados" chico tipo="secundario" onPress={() => perdidos.forEach(alternar)} />
        </Aviso>
      ) : null}

      {equipos.length ? (
        <>
          <Texto v="subtitulo">Equipos · {equipos.length}</Texto>
          <View style={estilos.rejilla}>
            {equipos.map(({ e, c }) => (
              <View key={e.id} style={{ width: ancho }}>
                <Pressable
                  onPress={() => router.push({ pathname: "/compania/[id]", params: { id: c.id, equipo: e.id } })}
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
                  <Corazon id={e.id} nombre={e.nombre} tam={32} />
                </View>
              </View>
            ))}
          </View>
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
});
