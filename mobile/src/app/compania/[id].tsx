import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, Share, StyleSheet, useWindowDimensions, View, type ScrollViewInstance } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FilaEquipo } from "@/componentes/fila-equipo";
import { equiposPara } from "@/lib/busqueda";
import { CATEGORIAS_RF, nombreEstado, urlFoto, useCatalogo, type EquipoPublico } from "@/lib/catalogo";
import { diasDeRenta, fechaCO, iniciales, pesos, plural, rangoCorto } from "@/lib/formato";
import { costoTransporte, cotizar, distanciaKm, textoKm } from "@/lib/geo";
import { usePedido } from "@/lib/pedido";
import { estimar, referenciaPara, textoRef } from "@/lib/referencias";
import { supabase } from "@/lib/supabase";
import { usePreguntar } from "@/lib/chat";
import { Aviso, Boton, Fila, Texto } from "@/ui/base";
import { BotonGuardar, Corazon } from "@/ui/corazon";
import { Estrellas, Icono, IconoCategoria } from "@/ui/iconos";
import { color, fuente, margen, radio } from "@/tema";

type Resena = { id: string; autor_nombre: string; estrellas: number; comentario: string | null; respuesta: string | null; creado: string };
type Foto = { ruta: string; equipo: string };

const NATIVO = Platform.OS !== "web";

// Ficha de una compañía (como la ficha de un alojamiento en Airbnb): fotos a todo el ancho,
// un panel blanco con el nombre, la calificación y sus servicios, sus equipos para tu pedido y,
// abajo, una barra fija con el precio de referencia y el botón para agregarlo al rider.
// Con ?equipo=… (al tocar la tarjeta de un equipo en el mapa) la ficha es de ESE equipo: su nombre
// es el título, la compañía va debajo, se puede guardar (♡) y la barra lo agrega al rider.
export default function Compania() {
  const { id, equipo: equipoId } = useLocalSearchParams<{ id: string; equipo?: string }>();
  const { catalogo } = useCatalogo();
  const { pedido, libres, enRider, cambiar } = usePedido();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [resenas, setResenas] = useState<Resena[]>([]);
  const [foto, setFoto] = useState(0);
  const scroll = useRef<ScrollViewInstance>(null);
  const [yEquipos, setYEquipos] = useState(0);
  const [cabeceraSolida, setCabeceraSolida] = useState(false);
  const chat = usePreguntar();
  const c = catalogo.companias.find((x) => x.id === id);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("resenas")
      .select("id, autor_nombre, estrellas, comentario, respuesta, creado")
      .eq("compania_id", id)
      .order("creado", { ascending: false })
      .limit(20)
      .then(({ data }) => setResenas((data ?? []) as Resena[]));
  }, [id]);

  if (!c) {
    return (
      <View style={{ flex: 1, padding: margen, paddingTop: insets.top + 60, gap: 12, backgroundColor: color.fondo }}>
        <Stack.Screen options={{ headerShown: false }} />
        <Texto>Esta compañía ya no tiene equipos publicados.</Texto>
        <Pressable onPress={() => router.back()}>
          <Texto peso={600} tono={color.acento}>
            Volver
          </Texto>
        </Pressable>
      </View>
    );
  }

  const nombreCat = (cat: string) => catalogo.categorias.find((x) => x.id === cat)?.nombre ?? cat;
  const foco = equipoId ? (c.equipos.find((e) => e.id === equipoId) ?? null) : null;
  const lugar = pedido.lugar;
  const dias = diasDeRenta(pedido.entrega, pedido.recogida);
  const conPedido = lugar !== null && dias > 0 && pedido.necesidades.length > 0;
  const dist = lugar ? distanciaKm(c, lugar) : null;
  const transporte = dist === null ? null : costoTransporte(c, dist);

  // Equipos que sirven para cada cosa del pedido; el resto va aparte.
  const usados = new Set<string>();
  const porNecesidad = pedido.necesidades
    .map((n) => {
      const { exactos, alternativas } = equiposPara(n, c.equipos);
      const lista = exactos.length ? exactos : alternativas;
      lista.forEach((e) => usados.add(e.id));
      return { n, lista, exacto: exactos.length > 0 || !n.texto };
    })
    .filter((g) => g.lista.length > 0);
  const otros: EquipoPublico[] = c.equipos.filter((e) => !usados.has(e.id));

  // Fotos: primero las del equipo elegido y luego las de los equipos de tu pedido.
  const fotos: Foto[] = [...(foco ? [foco] : []), ...porNecesidad.flatMap((g) => g.lista), ...otros]
    .filter((e, i, todos) => todos.findIndex((x) => x.id === e.id) === i)
    .flatMap((e) => e.fotos.map((ruta) => ({ ruta, equipo: e.id })))
    .slice(0, 10);

  // Lo que tiene para tu pedido (exacto o equivalente) y su precio de referencia.
  const refs = conPedido ? pedido.necesidades.map((n) => referenciaPara(n, c, libres)).filter((r) => r !== null) : [];
  const enElRider = pedido.rider.filter((i) => i.compania_id === c.id);
  const deEsta = enElRider.reduce((a, i) => a + i.cantidad, 0);
  const puede = lugar ? cotizar(c, [], 1, lugar, "entrega", false).puedeEntregar : false;
  const precio = !conPedido
    ? null
    : deEsta
      ? cotizar(
          c,
          enElRider.map((i) => ({ precio_dia: c.equipos.find((e) => e.id === i.equipo_id)?.precio_dia ?? 0, cantidad: i.cantidad })),
          dias,
          lugar!,
          puede ? "entrega" : "retiro",
          false,
        ).referencia
      : refs.length
        ? estimar(c, pedido.necesidades, libres, dias, lugar!).cobro.referencia
        : null;
  const desde = Math.min(...c.equipos.map((e) => e.precio_dia));
  const fechas = conPedido ? rangoCorto(pedido.entrega, pedido.recogida) : "";

  // El equipo elegido: cuántas unidades pide el pedido, cuántas hay libres y su precio de referencia
  // (con transporte, si ya hay lugar y fechas).
  const conFechas = !!pedido.entrega && dias > 0;
  const refFoco = foco ? (refs.find((x) => x.e.id === foco.id) ?? null) : null;
  const libresFoco = foco ? libres(foco) : 0;
  const enRiderFoco = foco ? enRider(foco) : 0;
  const cantFoco = Math.max(1, Math.min(refFoco?.necesidad.cantidad ?? 1, libresFoco || 1));
  const precioFoco =
    foco && lugar && dias > 0
      ? cotizar(c, [{ precio_dia: foco.precio_dia, cantidad: enRiderFoco || cantFoco }], dias, lugar, puede ? "entrega" : "retiro", false).referencia
      : null;
  const fechasFoco = conFechas ? rangoCorto(pedido.entrega, pedido.recogida) : "";
  function agregarFoco() {
    if (!foco) return;
    cambiar(foco, cantFoco);
    if (NATIVO) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }

  // Un toque agrega al rider lo que tiene para cada cosa del pedido (lo mismo que se ve en el mapa).
  function agregarTodo() {
    for (const r of refs) {
      if (enRider(r.e) === 0) cambiar(r.e, Math.min(r.necesidad.cantidad, libres(r.e)));
    }
    if (NATIVO) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }
  function irAlRider() {
    router.back();
    router.navigate("/rider");
  }
  function compartir() {
    Share.share({
      message: foco
        ? `${foco.nombre}, de ${c!.nombre}, en ENRENTA: ${pesos(foco.precio_dia)} por día (precio de referencia).`
        : `${c!.nombre} en ENRENTA: equipos de audio y RF en ${c!.zona ?? c!.ciudad}${desde ? `, desde ${pesos(desde)} por día` : ""}.`,
    }).catch(() => {});
  }

  const altoFoto = Math.round(width * 0.82) + insets.top;
  const r = c.resenas;

  return (
    <View style={{ flex: 1, backgroundColor: color.superficie }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        ref={scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={32}
        onScroll={(e) => {
          // Pasada la foto, arriba aparece una barra blanca con el nombre (como en Airbnb).
          const solida = e.nativeEvent.contentOffset.y > altoFoto - insets.top - 70;
          if (solida !== cabeceraSolida) setCabeceraSolida(solida);
        }}
      >
        {/* Fotos a todo el ancho, con contador. */}
        <View style={{ height: altoFoto, backgroundColor: color.superficie2 }}>
          {fotos.length ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={(e) => setFoto(Math.round(e.nativeEvent.contentOffset.x / width))}
              scrollEventThrottle={64}
            >
              {fotos.map((f) => (
                <Pressable
                  key={f.ruta}
                  onPress={() => router.push({ pathname: "/equipo/[id]", params: { id: f.equipo } })}
                  accessibilityLabel="Ver la ficha de este equipo"
                >
                  <Image source={{ uri: urlFoto(f.ruta) }} style={{ width, height: altoFoto }} contentFit="cover" transition={150} />
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <View style={estilos.sinFoto}>
              <IconoCategoria cat={c.equipos[0]?.categoria_id ?? "mic"} tam={64} tinta={color.suave} />
            </View>
          )}
          {fotos.length > 1 ? (
            <View style={estilos.contador} pointerEvents="none">
              <Texto peso={600} style={{ fontSize: 13 }} tono="#FFFFFF">
                {foto + 1} / {fotos.length}
              </Texto>
            </View>
          ) : null}
        </View>

        {/* Panel blanco que se monta sobre la foto. */}
        <View style={estilos.panel}>
          {foco ? (
            <View style={{ alignItems: "center", gap: 8 }}>
              <Texto v="etiqueta">{nombreCat(foco.categoria_id)}</Texto>
              {/* Título: el equipo. Debajo: la compañía que lo tiene. */}
              <Texto style={estilos.titulo}>{refFoco && !refFoco.exacto ? `≈ ${foco.nombre}` : foco.nombre}</Texto>
              <Texto peso={600} style={estilos.sub} tono={color.acento}>
                de {c.nombre}
                {c.verificada ? " ✓" : ""}
              </Texto>
              <Texto v="fino" style={[estilos.sub, { marginTop: -6 }]}>
                {[c.zona, c.ciudad].filter(Boolean).join(", ")}
                {dist !== null ? ` · a ${textoKm(dist)} de ${lugar!.nombre}` : ""}
              </Texto>
              <View style={{ marginTop: 6 }}>
                <BotonGuardar id={foco.id} nombre={foco.nombre} />
              </View>
            </View>
          ) : (
            <View style={{ alignItems: "center", gap: 8 }}>
              <Texto style={estilos.titulo}>{c.nombre}</Texto>
              <Texto v="fino" style={estilos.sub}>
                Compañía de audio y RF en {[c.zona, c.ciudad].filter(Boolean).join(", ")}
              </Texto>
              <Texto v="fino" style={[estilos.sub, { marginTop: -6 }]}>
                {plural(c.equipos.length, "equipo", "equipos")}
                {dist !== null ? ` · a ${textoKm(dist)} de ${lugar!.nombre}` : ""}
              </Texto>
            </View>
          )}

          {foco ? (
            <>
              {/* Precio · unidades libres · calificación de la compañía */}
              <View style={estilos.indicadores}>
                <View style={estilos.indicador}>
                  <Texto peso={600} style={{ fontSize: 20 }}>
                    {pesos(foco.precio_dia).replace("$", "$ ")}
                  </Texto>
                  <Texto v="fino">por día</Texto>
                </View>
                <View style={estilos.separador} />
                <View style={estilos.indicador}>
                  <Texto peso={600} style={{ fontSize: 20 }} tono={conFechas && libresFoco === 0 ? color.mal : color.tinta}>
                    {conFechas ? `${libresFoco} de ${foco.unidades}` : String(foco.unidades)}
                  </Texto>
                  <Texto v="fino">{conFechas ? "libres en tus fechas" : foco.unidades === 1 ? "unidad" : "unidades"}</Texto>
                </View>
                <View style={estilos.separador} />
                <View style={estilos.indicador}>
                  <Texto peso={600} style={{ fontSize: 20 }}>
                    {r && r.total > 0 ? r.promedio.toFixed(1).replace(".", ",") : "Nueva"}
                  </Texto>
                  {r && r.total > 0 ? <Estrellas valor={r.promedio} tam={11} /> : <Texto v="fino">sin reseñas</Texto>}
                </View>
              </View>

              {/* Sobre este equipo */}
              <View style={[{ gap: 6 }, estilos.linea]}>
                <Texto style={estilos.seccion}>Sobre este equipo</Texto>
                <Fila izq="Estado" der={nombreEstado(foco.estado)} />
                {CATEGORIAS_RF.has(foco.categoria_id) && (foco.banda_nombre || foco.banda_min_mhz) ? (
                  <Fila
                    izq="Banda RF"
                    der={[
                      foco.banda_nombre,
                      foco.banda_min_mhz && foco.banda_max_mhz ? `${foco.banda_min_mhz}–${foco.banda_max_mhz} MHz` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  />
                ) : null}
                {foco.dimensiones ? <Fila izq="Dimensiones" der={foco.dimensiones} /> : null}
                {foco.peso_kg ? <Fila izq="Peso" der={`${String(foco.peso_kg).replace(".", ",")} kg`} /> : null}
                {foco.incluye ? (
                  <View style={{ gap: 2, marginTop: 6 }}>
                    <Texto v="etiqueta">Incluye</Texto>
                    <Texto>{foco.incluye}</Texto>
                  </View>
                ) : null}
              </View>
            </>
          ) : (
            <View style={estilos.indicadores}>
              <View style={estilos.indicador}>
                <Texto peso={600} style={{ fontSize: 20 }}>
                  {r && r.total > 0 ? r.promedio.toFixed(1).replace(".", ",") : "Nueva"}
                </Texto>
                {r && r.total > 0 ? <Estrellas valor={r.promedio} tam={11} /> : <Texto v="fino">sin reseñas</Texto>}
              </View>
              <View style={estilos.separador} />
              <View style={[estilos.indicador, { flex: 1.5 }]}>
                {c.verificada ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Icono n="escudo" tam={22} tinta={color.acento} />
                    <Texto peso={600} style={{ fontSize: 15, lineHeight: 18 }} tono={color.acento}>
                      Compañía{"\n"}verificada
                    </Texto>
                  </View>
                ) : (
                  <>
                    <Texto peso={600} style={{ fontSize: 20 }}>
                      {pesos(desde).replace("$", "$ ")}
                    </Texto>
                    <Texto v="fino">desde, por día</Texto>
                  </>
                )}
              </View>
              <View style={estilos.separador} />
              <View style={estilos.indicador}>
                <Texto peso={600} style={{ fontSize: 20 }}>
                  {r?.total ?? 0}
                </Texto>
                <Texto v="fino" tono={color.tinta}>
                  {r?.total === 1 ? "Reseña" : "Reseñas"}
                </Texto>
              </View>
            </View>
          )}

          {/* Contacto (como el anfitrión de Airbnb). */}
          <View style={[estilos.fila, estilos.linea]}>
            <View style={estilos.avatar}>
              <Texto peso={700} tono="#FFFFFF" style={{ fontSize: 17 }}>
                {iniciales(c.nombre)}
              </Texto>
              {c.verificada ? (
                <View style={estilos.sello}>
                  <Icono n="check" tam={11} tinta="#FFFFFF" grosor={3} />
                </View>
              ) : null}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Texto peso={600} style={{ fontSize: 16 }}>
                Cotiza directo con {c.nombre}
              </Texto>
              <Texto v="fino" style={{ fontSize: 14 }}>
                Por WhatsApp · sin cargos de ENRENTA en la BETA
              </Texto>
            </View>
          </View>

          {/* Preguntar antes de cotizar: chat interno, no crea solicitud ni aparta equipos. */}
          <View style={{ gap: 8, marginTop: -6 }}>
            <Boton
              titulo="Hacer una pregunta"
              tipo="secundario"
              bloque
              cargando={chat.abriendo}
              icono={<Icono n="chat" tam={19} tinta={color.acento} />}
              onPress={() => chat.preguntar(c.id, c.nombre, foco ? `Hola, tengo una pregunta sobre ${foco.nombre}: ` : undefined)}
            />
            <Texto v="fino" style={{ textAlign: "center" }}>
              Pregunta antes de cotizar: no es una solicitud y no aparta equipos.
            </Texto>
            {chat.error ? <Aviso tono="mal" texto={chat.error} /> : null}
          </View>

          {/* Servicios */}
          <View style={[{ gap: 18 }, estilos.linea]}>
            <Servicio
              icono="camion"
              titulo={transporte === null ? "Retiro en bodega" : "Entrega y recogida en tu show"}
              texto={
                transporte === null
                  ? dist === null
                    ? `Entrega hasta ${c.cobertura_km} km de su bodega.`
                    : "No entrega a esa distancia: recoges y devuelves en su bodega."
                  : `${pesos(transporte)} de referencia, hasta ${c.cobertura_km} km.`
              }
            />
            {c.tecnico_nombre && c.tecnico_tarifa_dia ? (
              <Servicio icono="persona" titulo={`${c.tecnico_nombre} disponible`} texto={`${pesos(c.tecnico_tarifa_dia)} por día, si lo necesitas.`} />
            ) : null}
            {c.direccion_bodega || c.horario_bodega ? (
              <Servicio
                icono="lugar"
                titulo={`Bodega en ${c.zona ?? c.ciudad}`}
                texto={[c.direccion_bodega, c.horario_bodega].filter(Boolean).join(" · ")}
              />
            ) : null}
          </View>

          {/* Equipos */}
          <View onLayout={(e) => setYEquipos(e.nativeEvent.layout.y)} style={[{ gap: 6 }, estilos.linea]}>
            {porNecesidad.map(({ n, lista, exacto }) => (
              <View key={n.id} style={{ gap: 2, marginBottom: 14 }}>
                <Texto v="etiqueta">Para tu pedido</Texto>
                <Texto style={estilos.seccion}>
                  {n.cantidad}× {n.texto || nombreCat(n.categoria)}
                </Texto>
                {!exacto ? (
                  <Texto v="fino" tono={color.acento}>
                    ≈ No tiene «{n.texto}» exacto: estos son equivalentes de la misma categoría.
                  </Texto>
                ) : null}
                {lista.map((e) => (
                  <FilaEquipo key={e.id} e={e} />
                ))}
              </View>
            ))}
            {otros.length > 0 ? (
              <View style={{ gap: 2 }}>
                <Texto style={estilos.seccion}>{porNecesidad.length ? "Más equipos de esta compañía" : "Sus equipos"}</Texto>
                {otros.map((e) => (
                  <FilaEquipo key={e.id} e={e} />
                ))}
              </View>
            ) : null}
          </View>

          {/* Reseñas */}
          <View style={[{ gap: 14 }, estilos.linea]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Texto style={estilos.seccion}>
                {r && r.total > 0 ? `★ ${r.promedio.toFixed(1).replace(".", ",")} · ${plural(r.total, "reseña", "reseñas")}` : "Reseñas"}
              </Texto>
            </View>
            {resenas.length ? (
              resenas.map((x) => (
                <View key={x.id} style={estilos.resena}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View style={[estilos.avatar, { width: 36, height: 36, borderRadius: 18, backgroundColor: color.superficie2 }]}>
                      <Texto peso={600} style={{ fontSize: 13 }}>
                        {iniciales(x.autor_nombre)}
                      </Texto>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Texto peso={600}>{x.autor_nombre}</Texto>
                      <Texto v="fino">{fechaCO(x.creado).split(" · ")[0]}</Texto>
                    </View>
                    <Estrellas valor={x.estrellas} tam={12} />
                  </View>
                  {x.comentario ? <Texto>{x.comentario}</Texto> : null}
                  {x.respuesta ? (
                    <View style={estilos.respuesta}>
                      <Texto v="fino" peso={600} tono={color.tinta}>
                        Respuesta de {c.nombre}
                      </Texto>
                      <Texto v="fino">{x.respuesta}</Texto>
                    </View>
                  ) : null}
                </View>
              ))
            ) : (
              <Texto v="fino">Todavía nadie ha calificado a esta compañía.</Texto>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Barra blanca con el nombre cuando ya se pasó la foto. */}
      {cabeceraSolida ? (
        <View style={[estilos.cabecera, { height: insets.top + 62, paddingTop: insets.top }]} pointerEvents="none">
          <Texto peso={600} numberOfLines={1} style={{ fontSize: 16, maxWidth: width - 180 }}>
            {foco ? foco.nombre : c.nombre}
          </Texto>
        </View>
      ) : null}

      {/* Botones flotantes sobre la foto. */}
      <View style={[estilos.botonesArriba, { top: insets.top + 8 }]} pointerEvents="box-none">
        <Pressable onPress={() => router.back()} style={estilos.redondo} accessibilityRole="button" accessibilityLabel="Volver">
          <Icono n="atras" tam={20} grosor={2} />
        </Pressable>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable onPress={compartir} style={estilos.redondo} accessibilityRole="button" accessibilityLabel="Compartir">
            <Icono n="compartir" tam={19} grosor={1.9} />
          </Pressable>
          {foco ? <Corazon id={foco.id} nombre={foco.nombre} tam={44} /> : null}
        </View>
      </View>

      {/* Barra fija: precio de referencia y acción (del equipo elegido, si se abrió desde uno). */}
      {foco ? (
        <View style={[estilos.barra, { paddingBottom: insets.bottom + 12 }]}>
          <View style={{ flex: 1, gap: 2 }}>
            <Texto peso={700} style={estilos.precio}>
              {pesos(precioFoco ?? foco.precio_dia)}
            </Texto>
            <Texto v="fino">
              {precioFoco !== null
                ? `${enRiderFoco ? `${enRiderFoco} en tu rider` : `${cantFoco}× por ${plural(dias, "día", "días")}`} · ${fechasFoco}`
                : "por día · precio de referencia"}
            </Texto>
          </View>
          <View style={{ alignItems: "center", gap: 4 }}>
            <Pressable
              onPress={() => chat.preguntar(c.id, c.nombre, foco ? `Hola, tengo una pregunta sobre ${foco.nombre}: ` : undefined)}
              disabled={chat.abriendo}
              style={({ pressed }) => [estilos.preguntar, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel={`Hacer una pregunta a ${c.nombre}`}
            >
              <Icono n="chat" tam={22} tinta={color.acento} />
            </Pressable>
            <Texto v="fino" style={{ fontSize: 12 }}>
              {chat.abriendo ? "Abriendo…" : "Preguntar"}
            </Texto>
          </View>
          <View style={{ alignItems: "center", gap: 4, maxWidth: 200 }}>
            <Pressable
              onPress={enRiderFoco ? irAlRider : agregarFoco}
              disabled={!enRiderFoco && conFechas && libresFoco === 0}
              style={({ pressed }) => [
                estilos.accion,
                !enRiderFoco && conFechas && libresFoco === 0 && { backgroundColor: color.lineaFuerte },
                pressed && { opacity: 0.85 },
              ]}
              accessibilityRole="button"
            >
              <Texto peso={600} tono="#FFFFFF" style={{ fontSize: 16 }}>
                {enRiderFoco ? "Ver tu rider" : conFechas && libresFoco === 0 ? "Sin unidades libres" : "Quiero rentar"}
              </Texto>
            </Pressable>
            <Texto v="fino" style={{ fontSize: 12 }} numberOfLines={1}>
              {enRiderFoco ? "Ahí pides la cotización" : foco.nombre}
            </Texto>
          </View>
        </View>
      ) : (
        <View style={[estilos.barra, { paddingBottom: insets.bottom + 12 }]}>
          <View style={{ flex: 1, gap: 2 }}>
            {precio !== null ? (
              <>
                <Texto peso={700} style={estilos.precio}>
                  {pesos(precio)}
                </Texto>
                <Texto v="fino">
                  {deEsta ? `${deEsta} en tu rider` : `Por ${plural(dias, "día", "días")}`} · {fechas}
                </Texto>
              </>
            ) : (
              <>
                <Texto peso={700} style={estilos.precio}>
                  Desde {pesos(desde)}
                </Texto>
                <Texto v="fino">{conPedido ? "No tiene lo que pediste libre en tus fechas" : "por día · precio de referencia"}</Texto>
              </>
            )}
          </View>
          <View style={{ alignItems: "center", gap: 4 }}>
            <Pressable
              onPress={() => chat.preguntar(c.id, c.nombre)}
              disabled={chat.abriendo}
              style={({ pressed }) => [estilos.preguntar, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel={`Hacer una pregunta a ${c.nombre}`}
            >
              <Icono n="chat" tam={22} tinta={color.acento} />
            </Pressable>
            <Texto v="fino" style={{ fontSize: 12 }}>
              {chat.abriendo ? "Abriendo…" : "Preguntar"}
            </Texto>
          </View>
          <View style={{ alignItems: "center", gap: 4 }}>
            <Pressable
              onPress={deEsta ? irAlRider : refs.length ? agregarTodo : () => scroll.current?.scrollTo({ y: yEquipos + altoFoto - 30 })}
              style={({ pressed }) => [estilos.accion, pressed && { opacity: 0.85 }]}
              accessibilityRole="button"
            >
              <Texto peso={600} tono="#FFFFFF" style={{ fontSize: 16 }}>
                {deEsta ? "Ver tu rider" : refs.length ? "Quiero rentar" : "Ver equipos"}
              </Texto>
            </Pressable>
            <Texto v="fino" style={{ fontSize: 12 }}>
              {deEsta ? "Ahí pides la cotización" : refs.length ? `${refs.map((x) => textoRef(x, 14)).join(", ")}` : "Precios de referencia"}
            </Texto>
          </View>
        </View>
      )}
    </View>
  );
}

function Servicio({ icono, titulo, texto }: { icono: "camion" | "persona" | "lugar"; titulo: string; texto: string }) {
  return (
    <View style={estilos.fila}>
      <Icono n={icono} tam={26} tinta={color.tinta} grosor={1.5} />
      <View style={{ flex: 1, gap: 2 }}>
        <Texto peso={600} style={{ fontSize: 16 }}>
          {titulo}
        </Texto>
        <Texto v="fino" style={{ fontSize: 14 }}>
          {texto}
        </Texto>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  sinFoto: { flex: 1, alignItems: "center", justifyContent: "center" },
  contador: {
    position: "absolute",
    right: 16,
    bottom: 40,
    backgroundColor: "rgba(30,34,48,0.72)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  panel: {
    marginTop: -28,
    backgroundColor: color.superficie,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
    gap: 22,
  },
  titulo: { fontFamily: fuente[600], fontSize: 27, lineHeight: 32, letterSpacing: -0.6, textAlign: "center", color: color.tinta },
  sub: { fontSize: 15, lineHeight: 21, textAlign: "center" },
  indicadores: { flexDirection: "row", alignItems: "center", paddingVertical: 4 },
  indicador: { flex: 1, alignItems: "center", gap: 3 },
  separador: { width: 1, height: 38, backgroundColor: color.linea },
  fila: { flexDirection: "row", alignItems: "center", gap: 16 },
  linea: { borderTopWidth: 1, borderTopColor: color.linea, paddingTop: 22 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: color.acento, alignItems: "center", justifyContent: "center" },
  sello: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: color.coral,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  seccion: { fontFamily: fuente[600], fontSize: 19, letterSpacing: -0.2, color: color.tinta },
  resena: { gap: 8 },
  respuesta: { backgroundColor: color.superficie2, borderRadius: radio.sm, padding: 10, gap: 2 },
  botonesArriba: { position: "absolute", left: 16, right: 16, flexDirection: "row", justifyContent: "space-between" },
  cabecera: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: color.superficie,
    borderBottomWidth: 1,
    borderBottomColor: color.linea,
    alignItems: "center",
    justifyContent: "center",
  },
  redondo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.94)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#101828",
    shadowOpacity: 0.18,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  barra: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
    backgroundColor: color.superficie,
    borderTopWidth: 1,
    borderTopColor: color.linea,
  },
  precio: { fontSize: 19, textDecorationLine: "underline", color: color.tinta },
  accion: { backgroundColor: color.acento, height: 52, minWidth: 140, paddingHorizontal: 18, borderRadius: radio.pildora, alignItems: "center", justifyContent: "center" },
  preguntar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: color.acento,
    backgroundColor: color.acentoSuave,
    alignItems: "center",
    justifyContent: "center",
  },
});
