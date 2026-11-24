import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, usePathname } from "expo-router";
import { useEffect } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Circle, Defs, Pattern, RadialGradient, Rect, Stop } from "react-native-svg";
import { NOVEDADES_FULL } from "@/lib/novedades";
import { Boton, Texto } from "@/ui/base";
import { Cable, Fondo } from "@/ui/fondo";
import { Icono } from "@/ui/iconos";
import { Simbolo } from "@/ui/marca";
import { Aparece, tramo, useAparecer, useBucle } from "@/ui/movimiento";
import { color, fuente, radio } from "@/tema";
import { VINETAS } from "./vinetas";

// Anuncio de la BETA: lo que trae ENRENTA completa (el mismo de la web, web/src/components/anuncio-full.tsx).
// Sale una vez al entrar a la app (ya dentro, no en la pantalla de inicio); si se cierra, no vuelve
// en 7 días. Se puede abrir cuando se quiera con abrirAnuncio() (Cuenta, Inicio, Cómo funciona).

const CLAVE = "enrenta:anuncio-full:v1";
const PAUSA = 7 * 24 * 60 * 60 * 1000;

// El anuncio es una pantalla más (ruta /anuncio, transparente): así se abre también encima de la
// pantalla de inicio, que es una ventana a pantalla completa. Un Modal suelto no se veía ahí en el iPhone.
export function abrirAnuncio() {
  router.push("/anuncio");
}

export function AnuncioFull() {
  const ruta = usePathname();
  const dentro = ruta !== "/" && ruta !== "/bienvenida" && ruta !== "/anuncio";

  // Al entrar, con una pequeña pausa para no tapar la pantalla mientras carga.
  useEffect(() => {
    if (!dentro) return;
    let cancelado = false;
    const t = setTimeout(async () => {
      let visto = false;
      try {
        const v = Number(await AsyncStorage.getItem(CLAVE));
        visto = Number.isFinite(v) && Date.now() - v < PAUSA;
      } catch {
        // sin almacenamiento: se muestra
      }
      if (!cancelado && !visto) abrirAnuncio();
    }, 900);
    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, [dentro]);

  return null;
}

// Recuerda que ya se vio (no vuelve en 7 días).
export function recordarAnuncio() {
  AsyncStorage.setItem(CLAVE, String(Date.now())).catch(() => {});
}

export function Panel({ onCerrar }: { onCerrar: () => void }) {
  const insets = useSafeAreaInsets();
  const entra = useAparecer(60, 520);
  const pulso = useBucle(1800, 0);
  const flota = useBucle(5000, 0);
  return (
    <View style={[e.fondo, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onCerrar} accessibilityLabel="Cerrar" />
      <Animated.View
        style={[
          e.tarjeta,
          {
            opacity: entra,
            transform: [
              { translateY: entra.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) },
              { scale: entra.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) },
            ],
          },
        ]}
        accessibilityViewIsModal
      >
        <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
          {/* Cabecera oscura: retícula de puntos, luces de colores y el cable de la marca abajo. */}
          <View style={e.hero}>
            <Fondo>
              {(w, h) => (
                <>
                  <Defs>
                    <RadialGradient id="anuncioLuz1" cx="95%" cy="0%" rx="70%" ry="80%">
                      <Stop offset="0" stopColor="#6F86E8" stopOpacity="0.6" />
                      <Stop offset="1" stopColor="#6F86E8" stopOpacity="0" />
                    </RadialGradient>
                    <RadialGradient id="anuncioLuz2" cx="0%" cy="110%" rx="60%" ry="60%">
                      <Stop offset="0" stopColor="#FF7A59" stopOpacity="0.32" />
                      <Stop offset="1" stopColor="#FF7A59" stopOpacity="0" />
                    </RadialGradient>
                    <Pattern id="anuncioPuntos" width="18" height="18" patternUnits="userSpaceOnUse">
                      <Circle cx="2" cy="2" r="1" fill="rgba(255,255,255,0.12)" />
                    </Pattern>
                  </Defs>
                  <Rect width={w} height={h} fill="url(#anuncioPuntos)" />
                  <Rect width={w} height={h} fill="url(#anuncioLuz1)" />
                  <Rect width={w} height={h} fill="url(#anuncioLuz2)" />
                </>
              )}
            </Fondo>

            <View style={e.heroFila}>
              <View style={{ flex: 1, gap: 12 }}>
                <View style={e.pill}>
                  <View style={e.punto}>
                    <Animated.View
                      style={[
                        e.puntoOnda,
                        { opacity: tramo(pulso, [0, 1], [0.9, 0]), transform: [{ scale: tramo(pulso, [0, 1], [1, 3]) }] },
                      ]}
                    />
                  </View>
                  <Text style={e.pillTexto}>PRÓXIMAMENTE</Text>
                </View>
                <Text style={e.titulo} accessibilityRole="header">
                  Viene ENRENTA{"\n"}
                  <Text style={{ color: "#C9B8FF" }}>completa</Text>
                </Text>
              </View>
              <Animated.View style={[e.simbolo, { transform: [{ rotate: "-6deg" }, { translateY: tramo(flota, [0, 0.5, 1], [0, -6, 0]) }] }]}>
                <Simbolo tam={58} />
              </Animated.View>
            </View>
            <Text style={e.heroTexto}>
              Estamos terminando la versión que cuida cada renta de principio a fin: pagas en ENRENTA, el equipo sale y vuelve con fotos y, si algo
              falla, te respaldamos.
            </Text>
            <Cable alto={4} />
            <Pressable onPress={onCerrar} style={e.cerrar} accessibilityRole="button" accessibilityLabel="Cerrar" hitSlop={10}>
              <Icono n="cerrar" tam={16} tinta="#FFFFFF" grosor={2.2} />
            </Pressable>
          </View>

          <View style={e.lista}>
            {NOVEDADES_FULL.map((n, i) => {
              const Vineta = VINETAS[n.titulo];
              return (
                <Aparece key={n.titulo} retraso={160 + i * 70} style={e.item}>
                  {Vineta ? <Vineta /> : null}
                  <Texto peso={600} style={{ fontSize: 15.5, letterSpacing: -0.2 }}>
                    {n.titulo}
                  </Texto>
                  <Texto v="fino" style={{ fontSize: 13.5, lineHeight: 19 }}>
                    {n.texto}
                  </Texto>
                </Aparece>
              );
            })}
          </View>

          <View style={e.pie}>
            <Texto v="fino" style={{ textAlign: "center" }}>
              Ya la estamos probando por dentro. Mientras tanto, usa la BETA gratis: cotiza por WhatsApp y califica a las compañías.
            </Texto>
            <Boton titulo="Seguir en la BETA" bloque onPress={onCerrar} />
            <Boton
              titulo="Cómo funciona la BETA"
              tipo="enlace"
              style={{ alignSelf: "center" }}
              onPress={() => router.replace("/como-funciona")}
            />
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const e = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: "rgba(20,24,32,0.55)", justifyContent: "center", paddingHorizontal: 12 },
  tarjeta: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 460,
    maxHeight: "100%",
    borderRadius: 26,
    overflow: "hidden",
    backgroundColor: color.superficie,
    shadowColor: "#101828",
    shadowOpacity: 0.45,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 24 },
    elevation: 16,
  },
  hero: { paddingHorizontal: 22, paddingTop: 24, paddingBottom: 26, gap: 14, backgroundColor: color.tinta },
  heroFila: { flexDirection: "row", alignItems: "center", gap: 14 },
  pill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radio.pildora,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  punto: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.coral },
  puntoOnda: { ...StyleSheet.absoluteFill, borderRadius: 4, backgroundColor: color.coral },
  pillTexto: { fontFamily: fuente[700], fontSize: 10.5, letterSpacing: 1.6, color: "#FFFFFF" },
  titulo: { fontFamily: fuente[600], fontSize: 30, lineHeight: 33, letterSpacing: -1, color: "#FFFFFF" },
  heroTexto: { fontFamily: fuente[400], fontSize: 14.5, lineHeight: 21, color: "rgba(255,255,255,0.76)" },
  simbolo: {
    marginTop: 26, // debajo de la × de cerrar
    width: 84,
    height: 84,
    borderRadius: 22,
    backgroundColor: "#F3F5FD",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  cerrar: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  lista: { padding: 14, gap: 10 },
  item: { gap: 6, padding: 12, paddingBottom: 14, borderRadius: 18, backgroundColor: color.superficie2 },
  pie: { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 18, gap: 12 },
});
