import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { adivinarCategoria, coincide, norm } from "@/lib/busqueda";
import { NOMBRE_CORTO, nombreEstado, urlFoto, useCatalogo, type CompaniaPublica, type EquipoPublico } from "@/lib/catalogo";
import { pesos, plural, textoFecha } from "@/lib/formato";
import { distanciaKm, MEDELLIN, textoKm } from "@/lib/geo";
import { usePedido } from "@/lib/pedido";
import { Boton, Pantalla, Texto } from "@/ui/base";
import { Corazon } from "@/ui/corazon";
import { Icono, IconoCategoria } from "@/ui/iconos";
import { Mapa, type MapaRef } from "@/ui/mapa";
import { color, fuente, margen, radio } from "@/tema";
import { TarjetaMapa, type DatosTarjeta } from "./tarjeta-mapa";

type Item = { e: EquipoPublico; c: CompaniaPublica };
const NATIVO = Platform.OS !== "web";
const vibrar = () => {
  if (NATIVO) Haptics.selectionAsync().catch(() => {});
};
const corto = (s: string, max = 18) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);

// Explorar (subpanel de "Buscar equipos"): todos los equipos publicados en Medellín, para mirar
// sin armar un pedido. Se filtran por tipo o por texto y se ven en lista o, si la persona lo pide,
// en el mapa (cada compañía con lo que tiene). Si ya eligió fechas, dice qué está libre.
export function ExplorarEquipos({ cabeza, avisos }: { cabeza: ReactNode; avisos?: ReactNode }) {
  const { catalogo, cargando, recargar } = useCatalogo();
  const { pedido, libres } = usePedido();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const mapa = useRef<MapaRef>(null);
  const [texto, setTexto] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [vista, setVista] = useState<"lista" | "mapa">("lista");
  const [sel, setSel] = useState<string | null>(null);

  const conFechas = !!pedido.entrega && !!pedido.recogida;
  const fechas = conFechas ? `${textoFecha(pedido.entrega).split(" · ")[0]} – ${textoFecha(pedido.recogida).split(" · ")[0]}` : "";
  const lugar = pedido.lugar;
  const buscado = texto.trim();
  const orden = new Map(catalogo.categorias.map((c, i) => [c.id, i]));
  const todos: Item[] = catalogo.companias.flatMap((c) => c.equipos.map((e) => ({ e, c })));
  const adivinada = buscado.length >= 2 ? adivinarCategoria(buscado, todos.map((x) => x.e)) : null;

  // Qué se ve: por tipo y por texto (modelo, marca, compañía o tipo de equipo).
  const exacto = (x: Item) => !!buscado && (coincide(buscado, x.e) || norm(x.c.nombre).includes(norm(buscado)));
  const items = todos
    .filter((x) => (!cat || x.e.categoria_id === cat) && (!buscado || exacto(x) || x.e.categoria_id === adivinada))
    .sort(
      (a, b) =>
        Number(exacto(b)) - Number(exacto(a)) ||
        (orden.get(a.e.categoria_id) ?? 99) - (orden.get(b.e.categoria_id) ?? 99) ||
        (conFechas ? Number(libres(b.e) > 0) - Number(libres(a.e) > 0) : 0) ||
        a.e.nombre.localeCompare(b.e.nombre),
    );
  const companias = Array.from(
    items.reduce((m, x) => m.set(x.c.id, [...(m.get(x.c.id) ?? []), x]), new Map<string, Item[]>()).values(),
  );
  const filtrado = !!cat || !!buscado;

  // En el mapa: cada compañía con lo que tiene (si se busca algo, el nombre de lo que encontró).
  const marcadores = companias.map((lista) => {
    const c = lista[0].c;
    const algoLibre = !conFechas || lista.some((x) => libres(x.e) > 0);
    return {
      id: c.id,
      lat: c.lat,
      lng: c.lng,
      texto: buscado ? corto(lista[0].e.nombre) + (lista.length > 1 ? ` +${lista.length - 1}` : "") : plural(lista.length, "equipo", "equipos"),
      nivel: algoLibre ? ("alto" as const) : ("nada" as const),
    };
  });
  const clave = marcadores.map((m) => m.id).join(",");
  useEffect(() => {
    mapa.current?.encuadrar();
  }, [clave]);

  const elegida = sel ? companias.find((l) => l[0].c.id === sel) ?? null : null;
  // Si lo que se ve de esa compañía es un solo equipo (o se buscó uno), la tarjeta es de ese equipo.
  const unEquipo = elegida && (elegida.length === 1 || !!buscado) ? elegida[0].e : null;
  const tarjeta: DatosTarjeta | null = elegida
    ? {
        c: elegida[0].c,
        equipo: unEquipo,
        fotos: (unEquipo ? [...unEquipo.fotos, ...elegida.slice(1).map((x) => x.e.fotos[0])] : elegida.map((x) => x.e.fotos[0]))
          .filter(Boolean)
          .slice(0, 5),
        categoria: elegida[0].e.categoria_id,
        linea1: unEquipo
          ? elegida.length > 1
            ? `+ ${plural(elegida.length - 1, "equipo más", "equipos más")} de esta compañía`
            : ""
          : elegida.map((x) => x.e.nombre).join(" · "),
        linea2: [elegida[0].c.zona, lugar ? `a ${textoKm(distanciaKm(elegida[0].c, lugar))} de ${lugar.nombre}` : null, fechas || null]
          .filter(Boolean)
          .join(" · "),
        precio: unEquipo ? pesos(unEquipo.precio_dia) : `Desde ${pesos(Math.min(...elegida.map((x) => x.e.precio_dia)))}`,
        precioSub: unEquipo ? "por 24 h · referencia" : `por 24 h · ${plural(elegida.length, "equipo", "equipos")}`,
        apagada: conFechas && !elegida.some((x) => libres(x.e) > 0),
      }
    : null;

  function cambiarVista(v: "lista" | "mapa") {
    vibrar();
    setSel(null);
    setVista(v);
  }
  function limpiar() {
    setTexto("");
    setCat(null);
  }

  // Con la barra de pestañas abajo (en el celular) la píldora y la tarjeta quedan encima de ella.
  const pie = NATIVO ? insets.bottom + 64 : 20;

  const encabezado = (
    <>
      {cabeza}
      <View style={estilos.buscador}>
        <Icono n="buscar" tam={18} tinta={color.suave} />
        <TextInput
          value={texto}
          onChangeText={(v) => {
            setTexto(v);
            setSel(null);
          }}
          placeholder="Marca, modelo o compañía"
          placeholderTextColor="#9AA0AE"
          style={estilos.entrada}
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel="Buscar entre todos los equipos"
        />
        {texto ? (
          <Pressable onPress={() => setTexto("")} hitSlop={8} accessibilityRole="button" accessibilityLabel="Borrar la búsqueda">
            <Icono n="cerrar" tam={16} tinta={color.suave} grosor={2.2} />
          </Pressable>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -margen, marginTop: 10 }} contentContainerStyle={estilos.chips}>
        {[{ id: null, nombre: "Todos" }, ...catalogo.categorias].map((k) => {
          const activo = cat === k.id;
          return (
            <Pressable
              key={k.id ?? "todos"}
              onPress={() => {
                vibrar();
                setSel(null);
                setCat(k.id);
              }}
              style={[estilos.chip, activo && estilos.chipActivo]}
              accessibilityRole="button"
              accessibilityState={{ selected: activo }}
            >
              {k.id ? <IconoCategoria cat={k.id} tam={15} tinta={activo ? "#FFFFFF" : color.tinta} /> : null}
              <Text style={[estilos.chipTexto, activo && { color: "#FFFFFF" }]}>{k.id ? (NOMBRE_CORTO[k.id] ?? k.nombre) : k.nombre}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </>
  );

  return (
    <Pantalla fijo={encabezado} lleno>
      {vista === "lista" ? (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: margen, paddingTop: 12, paddingBottom: pie + 80, gap: 14 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={<RefreshControl refreshing={cargando && todos.length > 0} onRefresh={recargar} tintColor={color.acento} />}
        >
          {avisos}
          <View style={{ gap: 2 }}>
            <Texto peso={600} style={{ fontSize: 16 }}>
              {items.length
                ? `${plural(items.length, "equipo", "equipos")} de ${plural(companias.length, "compañía", "compañías")}`
                : "No encontramos equipos"}
            </Texto>
            <Texto v="fino">
              {conFechas ? `Disponibilidad para tus fechas: ${fechas}` : "Elige fechas en Buscar equipos para ver qué está libre en tu show."}
            </Texto>
          </View>

          {!items.length ? (
            <View style={estilos.vacio}>
              <Texto v="fino" style={{ textAlign: "center" }}>
                {buscado ? `Nada coincide con «${buscado}»${cat ? ` en ${NOMBRE_CORTO[cat] ?? cat}` : ""}.` : "No hay equipos de este tipo publicados todavía."}
              </Texto>
              {filtrado ? <Boton titulo="Ver todos los equipos" tipo="suave" chico onPress={limpiar} style={{ alignSelf: "center" }} /> : null}
            </View>
          ) : (
            <View style={estilos.lista}>
              {items.map((x, i) => (
                <FilaExplorar
                  key={x.e.id}
                  x={x}
                  primera={i === 0}
                  libresN={conFechas ? libres(x.e) : null}
                  km={lugar ? distanciaKm(x.c, lugar) : null}
                  nombreCat={!cat && (i === 0 || items[i - 1].e.categoria_id !== x.e.categoria_id) && !buscado ? (NOMBRE_CORTO[x.e.categoria_id] ?? x.e.categoria_id) : null}
                />
              ))}
            </View>
          )}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, overflow: "hidden" }}>
          <Mapa
            ref={mapa}
            style={StyleSheet.absoluteFill}
            centro={lugar ?? MEDELLIN}
            delta={0.18}
            ajustar
            margen={{ top: 50, right: 60, bottom: pie + 70, left: 60 }}
            lugar={lugar ?? null}
            marcadores={marcadores}
            activo={sel}
            onMarcador={(id) => {
              vibrar();
              setSel(id);
            }}
            onFondo={sel ? () => setSel(null) : undefined}
          />
          <Pressable
            onPress={() => mapa.current?.encuadrar()}
            style={[estilos.redondo, { position: "absolute", top: 12, right: 16 }]}
            accessibilityRole="button"
            accessibilityLabel="Ver todas las compañías en el mapa"
          >
            <Icono n="ubicar" tam={19} />
          </Pressable>
          {!marcadores.length ? (
            <View style={[estilos.avisoMapa, { top: 12 }]}>
              <Texto v="fino" tono={color.tinta}>
                Ninguna compañía tiene eso publicado.
              </Texto>
            </View>
          ) : null}
          {tarjeta ? (
            <View style={[estilos.flotante, { bottom: pie - 8 }]}>
              <TarjetaMapa d={tarjeta} ancho={Math.min(width - 24, 480)} onCerrar={() => setSel(null)} flotante />
            </View>
          ) : null}
        </View>
      )}

      {/* Lista ↔ mapa, solo cuando la persona lo pide (como el botón "Mapa" de Airbnb). */}
      {tarjeta ? null : (
        <View style={[estilos.flotante, { bottom: pie }]} pointerEvents="box-none">
          <Pressable
            onPress={() => cambiarVista(vista === "lista" ? "mapa" : "lista")}
            style={({ pressed }) => [estilos.pildora, pressed && { transform: [{ scale: 0.97 }] }]}
            accessibilityRole="button"
            accessibilityLabel={vista === "lista" ? "Ver los equipos en el mapa" : "Ver los equipos en lista"}
          >
            <Text style={estilos.pildoraTexto}>{vista === "lista" ? "Mapa" : "Lista"}</Text>
            <Icono n={vista === "lista" ? "mapa" : "lista"} tam={17} tinta="#FFFFFF" grosor={2} />
          </Pressable>
        </View>
      )}
    </Pantalla>
  );
}

// Un equipo en la lista: foto, nombre, compañía, precio de referencia y si está libre.
function FilaExplorar({
  x,
  primera,
  libresN,
  km,
  nombreCat,
}: {
  x: Item;
  primera: boolean;
  libresN: number | null; // null = sin fechas elegidas
  km: number | null;
  nombreCat: string | null; // título del tipo de equipo cuando empieza uno nuevo
}) {
  const { e, c } = x;
  return (
    <>
      {nombreCat ? (
        <Texto v="etiqueta" style={[estilos.seccion, primera && { borderTopWidth: 0 }]}>
          {nombreCat}
        </Texto>
      ) : null}
      <View style={[estilos.fila, !primera && !nombreCat && estilos.linea]}>
        <Pressable
          onPress={() => router.push({ pathname: "/equipo/[id]", params: { id: e.id } })}
          style={({ pressed }) => [estilos.filaToque, pressed && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel={`Ver ficha de ${e.nombre}, de ${c.nombre}`}
        >
          <View style={estilos.foto}>
            {e.fotos[0] ? (
              <Image source={{ uri: urlFoto(e.fotos[0]) }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
            ) : (
              <IconoCategoria cat={e.categoria_id} tam={30} tinta={color.suave} />
            )}
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Texto peso={600} numberOfLines={2} style={{ fontSize: 15.5 }}>
              {e.nombre}
            </Texto>
            <Texto v="fino" numberOfLines={1}>
              {c.nombre}
              {c.verificada ? " ✓" : ""}
              {km !== null ? ` · a ${textoKm(km)}` : c.zona ? ` · ${c.zona}` : ""}
            </Texto>
            <Texto style={{ fontSize: 14.5 }}>
              <Texto peso={700} style={{ fontSize: 14.5 }}>
                {pesos(e.precio_dia)}
              </Texto>{" "}
              <Texto v="fino">/ 24 h · {nombreEstado(e.estado)}</Texto>
            </Texto>
            {libresN === null ? (
              <Texto v="fino">{plural(e.unidades, "unidad", "unidades")}</Texto>
            ) : (
              <Texto v="fino" peso={500} tono={libresN > 0 ? color.ok : color.mal}>
                {libresN > 0 ? `${libresN} de ${e.unidades} libres en tus fechas` : "Sin unidades libres en tus fechas"}
              </Texto>
            )}
          </View>
        </Pressable>
        <Corazon id={e.id} nombre={e.nombre} tam={32} plano />
      </View>
    </>
  );
}

const sombra = {
  shadowColor: "#101828",
  shadowOpacity: 0.16,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 6,
} as const;

const estilos = StyleSheet.create({
  buscador: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 46,
    paddingHorizontal: 16,
    borderRadius: radio.pildora,
    backgroundColor: color.superficie,
    borderWidth: 1,
    borderColor: color.linea,
    ...sombra,
    shadowOpacity: 0.07,
  },
  entrada: { flex: 1, fontFamily: fuente[400], fontSize: 15.5, color: color.tinta, paddingVertical: 0 },
  chips: { gap: 8, paddingHorizontal: margen, paddingVertical: 2 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radio.pildora,
    backgroundColor: color.superficie,
    borderWidth: 1,
    borderColor: color.linea,
  },
  chipActivo: { backgroundColor: color.tinta, borderColor: color.tinta },
  chipTexto: { fontFamily: fuente[500], fontSize: 14, color: color.tinta },
  lista: { backgroundColor: color.superficie, borderRadius: radio.lg, borderWidth: 1, borderColor: color.linea, paddingHorizontal: 14 },
  seccion: { paddingTop: 14, paddingBottom: 2, borderTopWidth: 1, borderTopColor: color.linea },
  fila: { flexDirection: "row", alignItems: "flex-start", gap: 4, paddingVertical: 12 },
  linea: { borderTopWidth: 1, borderTopColor: color.linea },
  filaToque: { flex: 1, flexDirection: "row", gap: 12, alignItems: "center" },
  foto: {
    width: 84,
    height: 84,
    borderRadius: radio.md,
    backgroundColor: color.superficie2,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  vacio: { gap: 12, padding: 20, borderRadius: radio.lg, borderWidth: 1, borderStyle: "dashed", borderColor: color.lineaFuerte },
  flotante: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  pildora: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 46,
    paddingHorizontal: 20,
    borderRadius: radio.pildora,
    backgroundColor: color.tinta,
    ...sombra,
    shadowOpacity: 0.28,
  },
  pildoraTexto: { fontFamily: fuente[600], fontSize: 15, color: "#FFFFFF" },
  redondo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: color.superficie,
    alignItems: "center",
    justifyContent: "center",
    ...sombra,
  },
  avisoMapa: {
    position: "absolute",
    left: 16,
    right: 76,
    backgroundColor: color.superficie,
    borderRadius: radio.md,
    padding: 12,
    ...sombra,
  },
});
