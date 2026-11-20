import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { nombreEstado, urlFoto, type EquipoPublico } from "@/lib/catalogo";
import { pesos } from "@/lib/formato";
import { usePedido } from "@/lib/pedido";
import { Boton, Cantidad, Texto } from "@/ui/base";
import { Corazon } from "@/ui/corazon";
import { IconoCategoria } from "@/ui/iconos";
import { color, radio } from "@/tema";

// Un equipo en la lista de una compañía: foto, precio, unidades libres y cuántas van al rider.
export function FilaEquipo({ e }: { e: EquipoPublico }) {
  const { libres, enRider, cambiar } = usePedido();
  const l = libres(e);
  const n = enRider(e);
  return (
    <View style={estilos.fila}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 4 }}>
      <Pressable
        onPress={() => router.push({ pathname: "/equipo/[id]", params: { id: e.id } })}
        accessibilityRole="button"
        accessibilityLabel={`Ver ficha de ${e.nombre}`}
        style={[estilos.info, { flex: 1 }]}
      >
        <View style={estilos.foto}>
          {e.fotos[0] ? (
            <Image source={{ uri: urlFoto(e.fotos[0]) }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
          ) : (
            <IconoCategoria cat={e.categoria_id} tam={26} tinta={color.suave} />
          )}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Texto peso={600} numberOfLines={2}>
            {e.nombre}
          </Texto>
          <Texto v="fino">
            {pesos(e.precio_dia)} / 24 h · {nombreEstado(e.estado)}
          </Texto>
          <Texto v="fino" tono={l > 0 ? color.ok : color.mal}>
            {l > 0 ? `${l} de ${e.unidades} libres en tus fechas` : "Sin unidades libres en tus fechas"}
          </Texto>
        </View>
      </Pressable>
      <Corazon tipo="equipos" id={e.id} nombre={e.nombre} tam={32} plano />
      </View>
      <View style={estilos.accion}>
        {n > 0 ? (
          <Cantidad valor={n} onCambio={(v) => cambiar(e, v)} max={Math.max(n, l)} nombre={e.nombre} />
        ) : (
          <Boton titulo="Agregar" tipo="suave" chico deshabilitado={l === 0} onPress={() => cambiar(e, 1)} style={{ alignSelf: "flex-end" }} />
        )}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { gap: 10, paddingVertical: 12, borderTopWidth: 1, borderTopColor: color.linea },
  info: { flexDirection: "row", gap: 12, alignItems: "center" },
  foto: {
    width: 64,
    height: 64,
    borderRadius: radio.sm,
    backgroundColor: color.superficie2,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  accion: { alignItems: "flex-end" },
});
