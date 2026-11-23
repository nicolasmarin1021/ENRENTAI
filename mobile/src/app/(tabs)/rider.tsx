import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useState } from "react";
import { Platform, StyleSheet, Switch, View } from "react-native";
import { useCatalogo, type CompaniaPublica, type EquipoPublico } from "@/lib/catalogo";
import { aISO, diasDeRenta, pesos, plural, textoFecha } from "@/lib/formato";
import { cotizar, textoKm } from "@/lib/geo";
import { usePedido, type ItemRider } from "@/lib/pedido";
import { useSesion } from "@/lib/sesion";
import { mensajeError, supabase } from "@/lib/supabase";
import { abrirWhatsApp, mensajeSolicitud } from "@/lib/whatsapp";
import { Aviso, Boton, Campo, Cantidad, Encabezado, Fila, Pantalla, Segmentos, Tarjeta, Texto } from "@/ui/base";
import { Icono } from "@/ui/iconos";
import { color } from "@/tema";

type Linea = { i: ItemRider; e: EquipoPublico };
type Resultado = { compania: string; codigo?: string; whatsapp?: string; mensaje?: string; error?: string };

// Tu rider: la lista de equipos para un show. En la BETA cada compañía recibe su propia
// solicitud por WhatsApp; el precio final y el pago se acuerdan con ella.
export default function Rider() {
  const { catalogo } = useCatalogo();
  const { pedido, guardar, libres, cambiar, recargarOcupadas } = usePedido();
  const { usuario } = useSesion();
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [enviando, setEnviando] = useState<string | null>(null);
  const dias = diasDeRenta(pedido.entrega, pedido.recogida);
  const lugar = pedido.lugar;
  const listo = lugar !== null && dias > 0;

  const todos = catalogo.companias.flatMap((c) => c.equipos);
  const equipo = (id: string) => todos.find((e) => e.id === id);
  const huerfanos = pedido.rider.filter((i) => !equipo(i.equipo_id));

  const grupos = !listo
    ? []
    : [...new Set(pedido.rider.map((i) => i.compania_id))]
        .map((id) => catalogo.companias.find((c) => c.id === id))
        .filter((c): c is CompaniaPublica => Boolean(c))
        .map((c) => {
          const lineas = pedido.rider
            .filter((i) => i.compania_id === c.id)
            .map((i) => ({ i, e: equipo(i.equipo_id) }))
            .filter((x): x is Linea => Boolean(x.e));
          const puede = cotizar(c, [], dias, lugar!, "entrega", false).puedeEntregar;
          const op = pedido.opciones[c.id] ?? { modalidad: puede ? "entrega" : "retiro", tecnico: false };
          const modalidad: "entrega" | "retiro" = op.modalidad === "entrega" && !puede ? "retiro" : op.modalidad;
          const cobro = cotizar(
            c,
            lineas.map(({ i, e }) => ({ precio_dia: e.precio_dia, cantidad: i.cantidad })),
            dias,
            lugar!,
            modalidad,
            op.tecnico,
          );
          return { c, lineas, op, modalidad, cobro, puede };
        });
  type Grupo = (typeof grupos)[number];

  const unidades = pedido.rider.reduce((a, i) => a + i.cantidad, 0);
  const falta = (g: Grupo) => g.lineas.some(({ i, e }) => i.cantidad > libres(e));
  const setOpcion = (cid: string, cambio: Partial<{ modalidad: "entrega" | "retiro"; tecnico: boolean }>, actual: Grupo["op"]) =>
    guardar((p) => ({ ...p, opciones: { ...p.opciones, [cid]: { ...actual, ...cambio } } }));

  // Crea la solicitud en ENRENTA y abre WhatsApp con el mensaje ya escrito para esa compañía.
  async function pedirCotizacion(g: Grupo) {
    if (!usuario) {
      router.push("/entrar");
      return;
    }
    setEnviando(g.c.id);
    const { data, error } = await supabase.rpc("crear_solicitud", {
      p_compania: g.c.id,
      p_entrega: aISO(pedido.entrega),
      p_recogida: aISO(pedido.recogida),
      p_modalidad: g.modalidad,
      p_lugar_nombre: lugar!.nombre,
      p_lugar_direccion: lugar!.direccion ?? null,
      p_lat: lugar!.lat,
      p_lng: lugar!.lng,
      p_con_tecnico: g.op.tecnico,
      p_nota: pedido.nota.trim() || null,
      p_items: g.lineas.map(({ i }) => ({ equipo_id: i.equipo_id, cantidad: i.cantidad })),
    });
    setEnviando(null);
    const otros = (r: Resultado[]) => r.filter((x) => x.compania !== g.c.nombre);
    if (error) {
      setResultados((r) => [...otros(r), { compania: g.c.nombre, error: mensajeError(error, "No pudimos crear la solicitud. Revisa tu conexión e intenta de nuevo.") }]);
      return;
    }
    const d = data as { codigo: string; whatsapp: string };
    const mensaje = mensajeSolicitud({
      compania: g.c.nombre,
      codigo: d.codigo,
      entrega: aISO(pedido.entrega),
      recogida: aISO(pedido.recogida),
      lugar: lugar!.nombre,
      modalidad: g.modalidad,
      tecnico: g.cobro.tecnico > 0 ? (g.c.tecnico_nombre ?? "técnico") : null,
      items: g.lineas.map(({ i, e }) => ({ nombre: e.nombre, cantidad: i.cantidad })),
      referencia: g.cobro.referencia,
      nota: pedido.nota,
    });
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setResultados((r) => [...otros(r), { compania: g.c.nombre, codigo: d.codigo, whatsapp: d.whatsapp, mensaje }]);
    // Los equipos de esa compañía salen del rider: ya quedaron en la solicitud.
    guardar((p) => {
      const opciones = { ...p.opciones };
      delete opciones[g.c.id];
      return { ...p, rider: p.rider.filter((i) => i.compania_id !== g.c.id), opciones };
    });
    recargarOcupadas();
    abrirWhatsApp(d.whatsapp, mensaje).catch(() => {});
  }

  return (
    <Pantalla>
      <Encabezado
        titulo="Tu rider"
        sub={
          grupos.length
            ? `${plural(unidades, "unidad", "unidades")} de ${plural(grupos.length, "compañía", "compañías")} para ${lugar?.nombre}. A cada compañía le pides la cotización por WhatsApp.`
            : "Aquí armas la lista de equipos para un show. A cada compañía le pides la cotización por WhatsApp."
        }
      />

      {resultados.map((r) =>
        r.codigo ? (
          <Aviso key={r.compania} tono="ok" texto={`Solicitud ${r.codigo} lista para ${r.compania}. Envía el mensaje en WhatsApp para que te responda.`}>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <Boton titulo="Abrir de nuevo" tipo="primario" chico onPress={() => abrirWhatsApp(r.whatsapp!, r.mensaje!)} />
              <Boton titulo="Mis solicitudes" tipo="secundario" chico onPress={() => router.navigate("/solicitudes")} />
            </View>
          </Aviso>
        ) : (
          <Aviso key={r.compania} tono="mal" texto={`${r.compania}: ${r.error}`} />
        ),
      )}

      {huerfanos.length > 0 ? (
        <Aviso tono="aviso" texto={huerfanos.length === 1 ? "Un equipo de tu rider ya no está publicado." : `${huerfanos.length} equipos de tu rider ya no están publicados.`}>
          <Boton titulo="Quitarlos" chico tipo="secundario" onPress={() => guardar((p) => ({ ...p, rider: p.rider.filter((i) => equipo(i.equipo_id)) }))} />
        </Aviso>
      ) : null}

      {!pedido.rider.length || !listo ? (
        <Tarjeta style={{ alignItems: "flex-start" }}>
          <Texto>
            {!pedido.rider.length
              ? "Tu rider está vacío. Busca equipos (o explóralos todos) y agrégalos aquí."
              : "Completa las fechas y el lugar del show en Buscar equipos para ver la cotización."}
          </Texto>
          <Boton titulo="Ir a Buscar equipos" onPress={() => router.navigate("/buscar")} />
        </Tarjeta>
      ) : (
        <>
          <Tarjeta style={{ gap: 4 }}>
            <Texto v="etiqueta">Tu show</Texto>
            <Texto peso={600}>{lugar!.nombre}</Texto>
            <Texto v="fino">
              {textoFecha(pedido.entrega)} → {textoFecha(pedido.recogida)} · {plural(dias, "día", "días")}
            </Texto>
            <Boton titulo="Cambiar fechas o lugar" tipo="enlace" onPress={() => router.navigate("/buscar")} />
          </Tarjeta>

          {grupos.map((g) => (
            <Tarjeta key={g.c.id}>
              <View style={{ gap: 2 }}>
                <Texto v="subtitulo">{g.c.nombre}</Texto>
                <Texto v="fino">
                  {g.c.zona ? `${g.c.zona} · ` : ""}a {textoKm(g.cobro.km)} del show
                </Texto>
              </View>

              {g.lineas.map(({ i, e }) => {
                const l = libres(e);
                return (
                  <View key={e.id} style={estilos.linea}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Texto peso={500}>{e.nombre}</Texto>
                      <Texto v="fino" tono={i.cantidad > l ? color.mal : undefined}>
                        {pesos(e.precio_dia)} / 24 h · {i.cantidad > l ? `solo ${l} libres` : `${l} libres`}
                      </Texto>
                    </View>
                    <Cantidad valor={i.cantidad} onCambio={(v) => cambiar(e, v)} max={Math.max(i.cantidad, l)} nombre={e.nombre} />
                  </View>
                );
              })}

              <Segmentos
                opciones={[
                  { id: "entrega", texto: "Entrega en el show", deshabilitado: !g.puede },
                  { id: "retiro", texto: "Retiro en bodega" },
                ]}
                valor={g.modalidad}
                onCambio={(m) => setOpcion(g.c.id, { modalidad: m }, g.op)}
              />
              {!g.puede ? <Texto v="fino">Esta compañía no entrega a esa distancia: recoges y devuelves en su bodega.</Texto> : null}

              {g.c.tecnico_nombre && g.c.tecnico_tarifa_dia ? (
                <View style={estilos.linea}>
                  <View style={{ flex: 1 }}>
                    <Texto peso={500}>Con {g.c.tecnico_nombre}</Texto>
                    <Texto v="fino">{pesos(g.c.tecnico_tarifa_dia)} por día</Texto>
                  </View>
                  <Switch
                    value={g.op.tecnico}
                    onValueChange={(v) => setOpcion(g.c.id, { tecnico: v }, g.op)}
                    trackColor={{ true: color.acento, false: color.lineaFuerte }}
                    accessibilityLabel={`Pedir ${g.c.tecnico_nombre}`}
                  />
                </View>
              ) : null}

              <View style={estilos.cuentas}>
                <Fila izq={`Alquiler (${plural(dias, "día", "días")})`} der={pesos(g.cobro.alquiler)} />
                <Fila izq="Transporte" der={g.modalidad === "retiro" ? "Retiro en bodega" : pesos(g.cobro.transporte)} />
                {g.cobro.tecnico > 0 ? <Fila izq="Técnico" der={pesos(g.cobro.tecnico)} /> : null}
                <Fila izq="Precio de referencia" der={pesos(g.cobro.referencia)} fuerte />
                <Texto v="fino">El valor final y el pago los acuerdas con la compañía. ENRENTA no cobra nada.</Texto>
              </View>

              {falta(g) ? <Aviso tono="aviso" texto="Pediste más unidades de las que están libres en tus fechas. Ajusta las cantidades." /> : null}
              <Boton
                titulo={usuario ? "Cotizar" : "Entra para cotizar"}
                tipo="primario"
                bloque
                icono={<Icono n="enviar" tam={18} tinta="#FFFFFF" grosor={2} />}
                cargando={enviando === g.c.id}
                deshabilitado={falta(g) || (enviando !== null && enviando !== g.c.id)}
                onPress={() => pedirCotizacion(g)}
              />
            </Tarjeta>
          ))}

          <Tarjeta>
            <Campo
              etiqueta="Nota para las compañías (opcional)"
              placeholder="Ej.: El montaje empieza a las 2 p. m."
              value={pedido.nota}
              onChangeText={(v) => guardar((p) => ({ ...p, nota: v.slice(0, 500) }))}
              multiline
            />
          </Tarjeta>
        </>
      )}
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  linea: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6, borderTopWidth: 1, borderTopColor: color.linea },
  cuentas: { backgroundColor: color.superficie2, borderRadius: 14, padding: 12, gap: 2 },
});
