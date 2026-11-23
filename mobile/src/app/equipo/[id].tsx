import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CATEGORIAS_RF, nombreEstado, urlFoto, useCatalogo, useEquipo } from "@/lib/catalogo";
import { pesos } from "@/lib/formato";
import { usePreguntar } from "@/lib/chat";
import { usePedido } from "@/lib/pedido";
import { Aviso, Boton, Cantidad, Fila, Tarjeta, Texto } from "@/ui/base";
import { Corazon } from "@/ui/corazon";
import { Icono, IconoCategoria } from "@/ui/iconos";
import { color, margen, radio } from "@/tema";

// Ficha de un equipo (se abre encima): fotos, detalles y cuántas unidades van al rider.
export default function FichaEquipo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const hallado = useEquipo(id);
  const { catalogo } = useCatalogo();
  const { libres, enRider, cambiar, pedido } = usePedido();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [foto, setFoto] = useState(0);
  const chat = usePreguntar();

  if (!hallado) {
    return (
      <View style={{ padding: margen, gap: 12, paddingTop: insets.top + 24 }}>
        <Texto>Este equipo ya no está publicado.</Texto>
        <Boton titulo="Cerrar" onPress={() => router.back()} />
      </View>
    );
  }
  const { equipo: e, compania: c } = hallado;
  const l = libres(e);
  const n = enRider(e);
  const nombreCat = catalogo.categorias.find((x) => x.id === e.categoria_id)?.nombre ?? e.categoria_id;
  const ancho = Math.min(width, 640);

  return (
    <View style={{ flex: 1, backgroundColor: color.fondo }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}>
        {e.fotos.length ? (
          <View>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(ev) => setFoto(Math.round(ev.nativeEvent.contentOffset.x / ancho))}
            >
              {e.fotos.map((r) => (
                <Image key={r} source={{ uri: urlFoto(r) }} style={{ width: ancho, height: ancho * 0.75, backgroundColor: color.superficie2 }} contentFit="contain" />
              ))}
            </ScrollView>
            {e.fotos.length > 1 ? (
              <View style={estilos.puntos}>
                {e.fotos.map((r, i) => (
                  <View key={r} style={[estilos.punto, i === foto && { backgroundColor: color.acento, width: 18 }]} />
                ))}
              </View>
            ) : null}
          </View>
        ) : (
          <View style={[estilos.sinFoto, { height: ancho * 0.5 }]}>
            <IconoCategoria cat={e.categoria_id} tam={56} tinta={color.suave} />
          </View>
        )}

        <View style={{ padding: margen, gap: 14 }}>
          <View style={{ gap: 4 }}>
            <Texto v="etiqueta">{nombreCat}</Texto>
            <Texto v="titulo">{e.nombre}</Texto>
            <Texto v="fino">
              {c.nombre}
              {c.zona ? ` · ${c.zona}` : ""}
            </Texto>
            <Boton
              titulo={chat.abriendo ? "Abriendo el chat…" : `Preguntar a ${c.nombre}`}
              tipo="enlace"
              icono={<Icono n="chat" tam={17} tinta={color.acento} />}
              onPress={() => chat.preguntar(c.id, c.nombre, `Hola, tengo una pregunta sobre ${e.nombre}: `)}
              style={{ alignSelf: "flex-start", marginTop: 2 }}
            />
            {chat.error ? <Aviso tono="mal" texto={chat.error} /> : null}
          </View>

          <Tarjeta style={{ gap: 4 }}>
            <Fila izq="Precio de referencia" der={`${pesos(e.precio_dia)} / 24 h`} fuerte />
            <Fila izq="Estado" der={nombreEstado(e.estado)} />
            <Fila izq="Unidades" der={pedido.entrega ? `${l} de ${e.unidades} libres en tus fechas` : `${e.unidades}`} />
            {e.dimensiones ? <Fila izq="Dimensiones" der={e.dimensiones} /> : null}
            {e.peso_kg ? <Fila izq="Peso" der={`${String(e.peso_kg).replace(".", ",")} kg`} /> : null}
            {CATEGORIAS_RF.has(e.categoria_id) && (e.banda_nombre || e.banda_min_mhz) ? (
              <Fila
                izq="Banda RF"
                der={[e.banda_nombre, e.banda_min_mhz && e.banda_max_mhz ? `${e.banda_min_mhz}–${e.banda_max_mhz} MHz` : null].filter(Boolean).join(" · ")}
              />
            ) : null}
          </Tarjeta>

          {e.incluye ? (
            <Tarjeta style={{ gap: 6 }}>
              <Texto v="etiqueta">Incluye</Texto>
              <Texto>{e.incluye}</Texto>
            </Tarjeta>
          ) : null}
        </View>
      </ScrollView>

      <View style={estilos.botones}>
        <Corazon id={e.id} nombre={e.nombre} tam={36} />
        <Pressable onPress={() => router.back()} style={estilos.cerrar} accessibilityRole="button" accessibilityLabel="Cerrar">
          <Icono n="cerrar" tam={18} />
        </Pressable>
      </View>

      <View style={[estilos.barra, { paddingBottom: insets.bottom + 12 }]}>
        <View style={{ flex: 1 }}>
          <Texto peso={600}>{n > 0 ? `${n} en tu rider` : "Agrégalo a tu rider"}</Texto>
          <Texto v="fino">{l > 0 ? `${l} libres en tus fechas` : "Sin unidades libres en tus fechas"}</Texto>
        </View>
        {n > 0 ? (
          <Cantidad valor={n} onCambio={(v) => cambiar(e, v)} max={Math.max(n, l)} nombre={e.nombre} />
        ) : (
          <Boton titulo="Agregar" deshabilitado={l === 0} onPress={() => cambiar(e, 1)} />
        )}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  sinFoto: { backgroundColor: color.superficie2, alignItems: "center", justifyContent: "center" },
  puntos: { flexDirection: "row", gap: 6, justifyContent: "center", paddingTop: 10 },
  punto: { width: 7, height: 7, borderRadius: 4, backgroundColor: color.lineaFuerte },
  botones: { position: "absolute", top: 12, right: 14, flexDirection: "row", gap: 10 },
  cerrar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  barra: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: margen,
    paddingTop: 12,
    backgroundColor: color.superficie,
    borderTopWidth: 1,
    borderTopColor: color.linea,
    borderTopLeftRadius: radio.lg,
    borderTopRightRadius: radio.lg,
  },
});
