import * as Haptics from "expo-haptics";
import { useIsFocused } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { Animated, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBarraOculta } from "@/lib/barra";
import type { Catalogo } from "@/lib/catalogo";
import { diasDeRenta, pesos, plural, textoFecha } from "@/lib/formato";
import { distanciaKm, textoKm, type Punto } from "@/lib/geo";
import { usePedido } from "@/lib/pedido";
import { estimar, referenciaPara, textoRef, type Referencia } from "@/lib/referencias";
import { Texto } from "@/ui/base";
import { Hoja, type PosicionHoja } from "@/ui/hoja";
import { Icono, IconoCategoria } from "@/ui/iconos";
import { Mapa, type MapaRef, type Nivel } from "@/ui/mapa";
import { color, fuente, radio } from "@/tema";
import { SelectorModo } from "./selector-modo";
import { TarjetaMapa, type DatosTarjeta } from "./tarjeta-mapa";

type Resultado = DatosTarjeta & { pin: string; nivel: Nivel; cuenta: number; dist: number };

const NATIVO = Platform.OS !== "web";
const vibrar = () => {
  if (NATIVO) Haptics.selectionAsync().catch(() => {});
};

// Buscar equipos, después del pedido guiado: el mapa a pantalla completa (como el mapa de Airbnb).
// Cada compañía muestra en el mapa la referencia de equipo que tiene para lo que se busca; al
// tocarla aparece su tarjeta. Abajo, un panel con la lista que se arrastra hacia arriba.
export function Resultados({
  catalogo,
  onEditar,
  onExplorar,
}: {
  catalogo: Catalogo;
  onEditar: (paso: 1 | 2 | 3) => void;
  onExplorar: () => void; // pasar al subpanel Explorar (todos los equipos)
}) {
  const { pedido, libres } = usePedido();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const mapa = useRef<MapaRef>(null);
  const [alto, setAlto] = useState(0);
  const [foco, setFoco] = useState<string | null>(null); // cosa del pedido que se ve en el mapa
  const [sel, setSel] = useState<string | null>(null); // compañía elegida en el mapa
  const [focoMapa, setFocoMapa] = useState<Punto | null>(null);
  const [hoja, setHoja] = useState<PosicionHoja>("abajo");
  const [entrada] = useState(() => new Animated.Value(0));

  const lugar = pedido.lugar!;
  const dias = diasDeRenta(pedido.entrega, pedido.recogida);
  const necesidades = pedido.necesidades;
  const necFoco = necesidades.find((n) => n.id === foco) ?? null;
  const nombreCat = (id: string) => catalogo.categorias.find((c) => c.id === id)?.nombre ?? id;
  const fechas = `${textoFecha(pedido.entrega).split(" · ")[0]} – ${textoFecha(pedido.recogida).split(" · ")[0]}`;

  const resultados = useMemo<Resultado[]>(() => {
    const lista: Resultado[] = [];
    for (const c of catalogo.companias) {
      const dist = distanciaKm(c, lugar);
      const base = {
        c,
        dist,
        linea2: `${c.zona ? `${c.zona} · ` : ""}a ${textoKm(dist)} · ${fechas}`,
        categoria: (necFoco ?? necesidades[0])?.categoria ?? "mic",
      };
      if (necFoco) {
        // Lo que tiene para la cosa del pedido del chip elegido.
        const ref = referenciaPara(necFoco, c, libres);
        const l = ref ? libres(ref.e) : 0;
        const nivel: Nivel = l >= necFoco.cantidad ? "alto" : l > 0 ? "medio" : "nada";
        lista.push({
          ...base,
          fotos: ref ? [ref.e.fotos[0], ...c.equipos.filter((e) => e.id !== ref.e.id).map((e) => e.fotos[0])].filter(Boolean).slice(0, 5) : [],
          linea1: ref ? `${textoRef(ref, 60)} · ${ref.exacto ? "exacto" : "equivalente"}` : "No tiene esto libre en tus fechas",
          pin: ref ? textoRef(ref) : "Sin cupo",
          precio: ref ? pesos(ref.e.precio_dia) : "Sin unidades libres",
          precioSub: ref ? `por 24 h · ${l} ${l === 1 ? "libre" : "libres"}` : "en tus fechas",
          nivel,
          cuenta: ref ? (ref.exacto ? 2 : 1) * 1000 + l : 0,
          apagada: !ref,
        });
      } else {
        const refs = necesidades.map((n) => referenciaPara(n, c, libres)).filter((r): r is Referencia => r !== null);
        const { cubiertas, fotos, cobro } = estimar(c, necesidades, libres, dias, lugar);
        const todo = cubiertas === necesidades.length;
        const nivel: Nivel = todo ? "alto" : cubiertas ? "medio" : "nada";
        const principal = refs.find((r) => r.exacto) ?? refs[0];
        const exactos = refs.filter((r) => r.exacto).length;
        lista.push({
          ...base,
          fotos,
          linea1: refs.length
            ? refs.map((r) => textoRef(r, 40)).join(" · ") + (todo ? "" : ` · tiene ${cubiertas} de ${necesidades.length}`)
            : "No tiene lo que buscas libre en tus fechas",
          pin: principal ? textoRef(principal) + (refs.length > 1 ? ` +${refs.length - 1}` : "") : "Sin cupo",
          precio: cubiertas ? pesos(cobro.referencia) : "Sin unidades libres",
          precioSub: todo
            ? `por ${plural(dias, "día", "días")} · referencia`
            : cubiertas
              ? `por ${cubiertas} de ${necesidades.length} cosas de tu pedido`
              : "en tus fechas",
          nivel,
          // Orden: las que cubren más cosas del pedido y, entre ellas, las que tienen más exactos.
          cuenta: cubiertas * 100 + exactos,
          apagada: !cubiertas,
        });
      }
    }
    return lista.sort((a, b) => b.cuenta - a.cuenta || a.dist - b.dist);
  }, [catalogo.companias, lugar, necesidades, necFoco, libres, dias, fechas]);

  const elegido = resultados.find((r) => r.c.id === sel) ?? null;
  const conAlgo = resultados.filter((r) => r.nivel !== "nada").length;
  const hayEquivalentes = resultados.some((r) => r.pin.startsWith("≈"));

  function elegir(id: string) {
    vibrar();
    setSel(id);
    // El mapa se mueve hasta la compañía para que su píldora no quede detrás de la tarjeta.
    const c = catalogo.companias.find((x) => x.id === id);
    if (c) setFocoMapa({ lat: c.lat, lng: c.lng });
    setHoja("oculta");
    // La tarjeta entra desde abajo.
    entrada.setValue(0);
    Animated.spring(entrada, { toValue: 1, useNativeDriver: NATIVO, damping: 18, stiffness: 200 }).start();
  }
  function cerrar() {
    setSel(null);
    setHoja("abajo");
  }

  // Con el mapa en primer plano (una compañía elegida o la lista abajo) la barra de pestañas se
  // esconde, como en Airbnb; al subir la lista vuelve a aparecer. Solo mientras esta pestaña está
  // a la vista: al pasar a otra (el Rider, por ejemplo) el mapa sigue abierto detrás y la barra
  // tiene que volver.
  const enVista = useIsFocused();
  const barraOculta = enVista && (sel !== null || hoja === "abajo" || hoja === "oculta");
  useBarraOculta(barraOculta);
  const web = Platform.OS === "web";
  const arriba = insets.top + (web ? 72 : 8); // en la web (solo para revisar) las pestañas van arriba y no se esconden
  const pie = Math.max(12, insets.bottom - 14); // la tarjeta queda cerca del borde de abajo
  const anchoTarjeta = Math.min(width - 24, 480);

  return (
    <View style={{ flex: 1, overflow: "hidden", backgroundColor: color.fondo }} onLayout={(e) => setAlto(e.nativeEvent.layout.height)}>
      <Mapa
        ref={mapa}
        style={StyleSheet.absoluteFill}
        centro={lugar}
        delta={0.16}
        ajustar
        margen={{ top: arriba + 180, right: 60, bottom: insets.bottom + 130, left: 60 }}
        lugar={lugar}
        marcadores={resultados.map((r) => ({ id: r.c.id, lat: r.c.lat, lng: r.c.lng, texto: r.pin, nivel: r.nivel }))}
        activo={sel}
        onMarcador={elegir}
        onFondo={sel ? cerrar : undefined}
        foco={focoMapa}
      />

      {/* Arriba: resumen del pedido (se toca para editarlo) y una píldora por cada cosa del pedido. */}
      <View style={[estilos.arriba, { top: arriba }]} pointerEvents="box-none">
        {/* Volver al lugar, pasar a Explorar y, arriba a la derecha, el interruptor Necesito | Tengo. */}
        <View style={estilos.fila} pointerEvents="box-none">
          <Pressable onPress={() => onEditar(3)} style={[estilos.redondo, { width: 40, height: 40 }]} accessibilityRole="button" accessibilityLabel="Cambiar el lugar del show">
            <Icono n="atras" tam={20} grosor={2} />
          </Pressable>
          <Pressable
            onPress={() => {
              vibrar();
              onExplorar();
            }}
            style={({ pressed }) => [estilos.explorar, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
            accessibilityLabel="Explorar todos los equipos"
          >
            <Icono n="cuadricula" tam={15} grosor={2} />
            <Texto peso={600} style={{ fontSize: 13.5 }}>
              Explorar
            </Texto>
          </Pressable>
          <View style={{ flex: 1 }} />
          <SelectorModo flotante />
        </View>
        <View style={estilos.fila}>
          <Pressable onPress={() => onEditar(1)} style={estilos.busqueda} accessibilityRole="button" accessibilityLabel="Editar el pedido">
            <Texto peso={600} style={{ fontSize: 15 }} numberOfLines={1}>
              Equipos cerca de {lugar.nombre}
            </Texto>
            <Texto v="fino" numberOfLines={1}>
              {fechas} · {plural(necesidades.reduce((a, n) => a + n.cantidad, 0), "equipo", "equipos")}
            </Texto>
          </Pressable>
          <Pressable onPress={() => onEditar(2)} style={estilos.redondo} accessibilityRole="button" accessibilityLabel="Cambiar las fechas">
            <Icono n="calendario" tam={19} />
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.chips}>
          <Pressable onPress={() => setFoco(null)} style={[estilos.chip, !foco && estilos.chipActivo]} accessibilityRole="button" accessibilityState={{ selected: !foco }}>
            <Texto peso={500} style={[estilos.chipTexto, !foco && { color: "#FFFFFF" }]}>
              Todo el pedido
            </Texto>
          </Pressable>
          {necesidades.map((n) => {
            const activo = foco === n.id;
            return (
              <Pressable
                key={n.id}
                onPress={() => {
                  vibrar();
                  setFoco(activo ? null : n.id);
                }}
                style={[estilos.chip, activo && estilos.chipActivo]}
                accessibilityRole="button"
                accessibilityState={{ selected: activo }}
              >
                <IconoCategoria cat={n.categoria} tam={15} tinta={activo ? "#FFFFFF" : color.tinta} />
                <Texto peso={500} style={[estilos.chipTexto, activo && { color: "#FFFFFF" }]}>
                  {n.cantidad}× {n.texto || nombreCat(n.categoria)}
                </Texto>
              </Pressable>
            );
          })}
        </ScrollView>
        <Pressable
          onPress={() => mapa.current?.encuadrar()}
          style={[estilos.redondo, { alignSelf: "flex-end", marginRight: 16 }]}
          accessibilityRole="button"
          accessibilityLabel="Ver todas las compañías en el mapa"
        >
          <Icono n="ubicar" tam={19} />
        </Pressable>
      </View>

      {/* La compañía elegida en el mapa. */}
      {elegido ? (
        <Animated.View
          style={[
            estilos.flotante,
            { bottom: pie, opacity: entrada, transform: [{ translateY: entrada.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] },
          ]}
        >
          <TarjetaMapa d={elegido} ancho={anchoTarjeta} onCerrar={cerrar} flotante />
        </Animated.View>
      ) : null}

      {/* Lista de compañías: un panel que se arrastra desde abajo. */}
      {alto > 0 ? (
        <Hoja
          alto={alto}
          arriba={arriba + 170}
          asomada={insets.bottom + 62}
          posicion={hoja}
          onPosicion={setHoja}
          cabeza={
            <View style={{ alignItems: "center", gap: 2 }}>
              <Texto peso={600} style={{ fontSize: 15 }}>
                {conAlgo
                  ? `${plural(conAlgo, "compañía tiene", "compañías tienen")} lo que buscas`
                  : "Nadie tiene esos equipos libres en tus fechas"}
              </Texto>
              {hayEquivalentes && hoja !== "abajo" ? <Texto v="fino">≈ es un equipo equivalente al que pediste</Texto> : null}
            </View>
          }
        >
          {!conAlgo ? (
            <Texto v="fino" style={{ textAlign: "center" }}>
              Prueba con otras fechas o con otros equipos.
            </Texto>
          ) : null}
          {resultados.map((r) => (
            <TarjetaMapa key={r.c.id} d={r} ancho={width - 32} />
          ))}
        </Hoja>
      ) : null}
    </View>
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
  arriba: { position: "absolute", left: 0, right: 0, gap: 10 },
  fila: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16 },
  busqueda: {
    flex: 1,
    minHeight: 56,
    borderRadius: 28,
    backgroundColor: color.superficie,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    ...sombra,
  },
  redondo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: color.superficie,
    alignItems: "center",
    justifyContent: "center",
    ...sombra,
  },
  explorar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: color.superficie,
    ...sombra,
  },
  chips: { gap: 8, paddingHorizontal: 16, paddingVertical: 2 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 38,
    paddingHorizontal: 16,
    borderRadius: radio.pildora,
    backgroundColor: color.superficie,
    borderWidth: 1,
    borderColor: color.linea,
    ...sombra,
    shadowOpacity: 0.08,
  },
  chipActivo: { backgroundColor: color.tinta, borderColor: color.tinta },
  chipTexto: { fontFamily: fuente[500], fontSize: 14 },
  flotante: { position: "absolute", left: 0, right: 0, alignItems: "center" },
});
