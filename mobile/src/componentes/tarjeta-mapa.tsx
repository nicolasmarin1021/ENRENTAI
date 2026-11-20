import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { urlFoto, type CompaniaPublica } from "@/lib/catalogo";
import { Texto } from "@/ui/base";
import { Corazon } from "@/ui/corazon";
import { Icono, IconoCategoria } from "@/ui/iconos";
import { color, radio } from "@/tema";

// Tarjeta de una compañía sobre el mapa (como la de Airbnb): fotos que se deslizan con puntos,
// ♡ para guardar, × para cerrar y, abajo, nombre, calificación, zona, fechas y precio.

export type DatosTarjeta = {
  c: CompaniaPublica;
  fotos: string[]; // rutas de fotos de sus equipos (las del pedido primero)
  categoria: string; // para el ícono cuando no hay fotos
  linea1: string; // la referencia que tiene para lo que se busca: "Shure ULXD4 + ULXD2" o "≈ …" (equivalente)
  linea2: string; // "Belén · a 0,3 km · sáb 21 nov – dom 22 nov"
  precio: string; // "$430.000"
  precioSub: string; // "por 1 día · referencia" o "tiene 2 de 3 cosas"
  apagada?: boolean;
};

const abrir = (id: string) => router.push({ pathname: "/compania/[id]", params: { id } });

export function TarjetaMapa({ d, ancho, onCerrar, flotante = false }: { d: DatosTarjeta; ancho: number; onCerrar?: () => void; flotante?: boolean }) {
  const [foto, setFoto] = useState(0);
  const altoFoto = Math.round(ancho * (flotante ? 0.52 : 0.62));
  const r = d.c.resenas;

  return (
    <View style={[estilos.tarjeta, flotante && estilos.flotante, { width: ancho }]}>
      <View style={{ height: altoFoto, backgroundColor: color.superficie2 }}>
        {d.fotos.length ? (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setFoto(Math.round(e.nativeEvent.contentOffset.x / ancho))}
            onScroll={(e) => setFoto(Math.round(e.nativeEvent.contentOffset.x / ancho))}
            scrollEventThrottle={64}
          >
            {d.fotos.map((ruta) => (
              <Pressable key={ruta} onPress={() => abrir(d.c.id)} accessibilityLabel={`Ver equipos de ${d.c.nombre}`}>
                <Image source={{ uri: urlFoto(ruta) }} style={{ width: ancho, height: altoFoto }} contentFit="cover" transition={150} />
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <Pressable onPress={() => abrir(d.c.id)} style={estilos.sinFoto} accessibilityLabel={`Ver equipos de ${d.c.nombre}`}>
            <IconoCategoria cat={d.categoria} tam={48} tinta={color.suave} />
          </Pressable>
        )}
        {d.fotos.length > 1 ? (
          <View style={estilos.puntos} pointerEvents="none">
            {d.fotos.map((ruta, i) => (
              <View key={ruta} style={[estilos.punto, i === foto && estilos.puntoActivo]} />
            ))}
          </View>
        ) : null}
        {d.c.verificada ? (
          <View style={estilos.sello} pointerEvents="none">
            <Texto style={{ fontSize: 12 }} peso={600}>
              Verificada
            </Texto>
          </View>
        ) : null}
        <View style={estilos.botones}>
          <Corazon tipo="companias" id={d.c.id} nombre={d.c.nombre} />
          {onCerrar ? (
            <Pressable onPress={onCerrar} style={estilos.cerrar} hitSlop={8} accessibilityRole="button" accessibilityLabel="Cerrar">
              <Icono n="cerrar" tam={16} grosor={2.2} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <Pressable onPress={() => abrir(d.c.id)} style={estilos.info} accessibilityRole="button" accessibilityLabel={`Ver equipos de ${d.c.nombre}`}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Texto peso={600} style={{ flex: 1, fontSize: 16.5 }} numberOfLines={1}>
            {d.c.nombre}
          </Texto>
          {r && r.total > 0 ? (
            <Texto peso={500} style={{ fontSize: 14.5 }}>
              ★ {r.promedio.toFixed(2).replace(".", ",")} ({r.total})
            </Texto>
          ) : (
            <Texto v="fino">Nueva</Texto>
          )}
        </View>
        <Texto peso={500} style={{ fontSize: 14.5 }} tono={d.apagada ? color.suave : color.acento} numberOfLines={1}>
          {d.linea1}
        </Texto>
        <Texto v="fino" style={{ fontSize: 14.5 }} numberOfLines={1}>
          {d.linea2}
        </Texto>
        <Texto style={{ fontSize: 15.5, marginTop: 2 }} tono={d.apagada ? color.suave : color.tinta}>
          <Texto peso={700} style={{ fontSize: 15.5 }} tono={d.apagada ? color.suave : color.tinta}>
            {d.precio}
          </Texto>{" "}
          {d.precioSub}
        </Texto>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { backgroundColor: color.superficie, borderRadius: radio.lg, overflow: "hidden" },
  flotante: {
    shadowColor: "#101828",
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  sinFoto: { flex: 1, alignItems: "center", justifyContent: "center" },
  puntos: { position: "absolute", bottom: 10, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 5 },
  punto: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.6)" },
  puntoActivo: { backgroundColor: "#FFFFFF", width: 7, height: 7, borderRadius: 3.5 },
  sello: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(255,255,255,0.94)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radio.pildora,
  },
  botones: { position: "absolute", top: 12, right: 12, flexDirection: "row", gap: 10 },
  cerrar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.94)",
    alignItems: "center",
    justifyContent: "center",
  },
  info: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, gap: 2 },
});
