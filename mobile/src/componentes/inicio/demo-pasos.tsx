import { useEffect, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { Path, Rect } from "react-native-svg";
import { Texto } from "@/ui/base";
import { Fondo } from "@/ui/fondo";
import { Icono, IconoCategoria, IconoWhatsApp } from "@/ui/iconos";
import { Simbolo } from "@/ui/marca";
import { Aparece, movimientoReducido, NATIVO, tramo, useBucle } from "@/ui/movimiento";
import { color, fuente, radio } from "@/tema";

// Demo del inicio (como la de la portada web): los cuatro pasos para rentar, con una pantalla de
// ejemplo que se arma sola. Pasa sola de un paso al siguiente; tocar un número salta a ese paso.

const DURACION = 6500;

const PASOS = [
  { titulo: "Arma tu rider", texto: "Busca por marca, modelo o tipo de equipo y elige cuántos necesitas, las fechas y el lugar." },
  { titulo: "Mira quién lo tiene libre", texto: "El mapa te muestra las compañías con unidades libres en tus fechas y qué referencia tienen." },
  { titulo: "Cotiza por WhatsApp", texto: "Con un toque se abre WhatsApp con tu rider, fechas y lugar ya escritos." },
  { titulo: "Queda apartado", texto: "Cuando la compañía marca tu solicitud como rentada, el equipo queda reservado para ti." },
];

// Segundos de la escena → punto del avance (0 a 1).
const f = (s: number) => Math.min(0.999, Math.max(0.001, (s * 1000) / DURACION));
const entra = (p: Animated.Value, s: number, dy = 10, d = 0.4) => ({
  opacity: tramo(p, [0, f(s), f(s + d), 1], [0, 0, 1, 1]),
  transform: [{ translateY: tramo(p, [0, f(s), f(s + d), 1], [dy, dy, 0, 0]) }],
});
const desdeIzq = (p: Animated.Value, s: number) => ({
  opacity: tramo(p, [0, f(s), f(s + 0.4), 1], [0, 0, 1, 1]),
  transform: [{ translateX: tramo(p, [0, f(s), f(s + 0.4), 1], [-16, -16, 0, 0]) }],
});
const salta = (p: Animated.Value, s: number) => ({
  opacity: tramo(p, [0, f(s), f(s + 0.25), 1], [0, 0, 1, 1]),
  transform: [{ scale: tramo(p, [0, f(s), f(s + 0.25), f(s + 0.4), 1], [0.55, 0.55, 1.08, 1, 1]) }],
});

export function DemoPasos() {
  const [paso, setPaso] = useState(0);
  const [vuelta, setVuelta] = useState(0);
  const [p] = useState(() => new Animated.Value(0));

  useEffect(() => {
    p.setValue(0);
    if (movimientoReducido()) {
      p.setValue(1);
      return;
    }
    const a = Animated.timing(p, { toValue: 1, duration: DURACION, easing: Easing.linear, useNativeDriver: NATIVO });
    a.start(({ finished }) => {
      if (finished) {
        setPaso((x) => (x + 1) % PASOS.length);
        setVuelta((v) => v + 1);
      }
    });
    return () => a.stop();
  }, [paso, vuelta, p]);

  const ir = (i: number) => {
    setPaso(i);
    setVuelta((v) => v + 1);
  };
  const actual = PASOS[paso];

  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 8 }}>
        <Text style={e.ceja}>SI NECESITAS EQUIPOS</Text>
        <Text style={e.h2}>
          Del rider a la cotización, <Text style={{ color: color.acento }}>en cuatro pasos</Text>
        </Text>
      </View>

      <View style={e.numeros}>
        <View style={e.linea} />
        {PASOS.map((x, i) => {
          const on = i === paso;
          return (
            <Pressable
              key={x.titulo}
              onPress={() => ir(i)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`Paso ${i + 1}: ${x.titulo}`}
              hitSlop={8}
              style={[e.num, on && e.numOn, i < paso && e.numHecho]}
            >
              <Text style={[e.numTexto, (on || i < paso) && { color: on ? "#FFFFFF" : color.acento }]}>{i + 1}</Text>
            </Pressable>
          );
        })}
      </View>

      <Aparece key={`t${vuelta}`} retraso={0} desde="derecha" style={{ gap: 4, minHeight: 66 }}>
        <Texto peso={600} style={{ fontSize: 19, letterSpacing: -0.3 }}>
          {actual.titulo}
        </Texto>
        <Texto v="fino" style={{ fontSize: 14.5, lineHeight: 20 }}>
          {actual.texto}
        </Texto>
      </Aparece>

      <View style={e.barra}>
        <Animated.View style={[e.barraLlena, { transform: [{ scaleX: p }] }]} />
      </View>

      <View style={e.escenario} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {paso === 0 ? <EscenaRider key={vuelta} p={p} /> : null}
        {paso === 1 ? <EscenaMapa key={vuelta} p={p} /> : null}
        {paso === 2 ? <EscenaWhatsApp key={vuelta} p={p} /> : null}
        {paso === 3 ? <EscenaApartado key={vuelta} p={p} /> : null}
      </View>
      <Texto v="fino" style={{ textAlign: "center", fontSize: 12 }}>
        Pantallas con datos de ejemplo
      </Texto>
    </View>
  );
}

// ---- 1 · Arma tu rider
function EscenaRider({ p }: { p: Animated.Value }) {
  const BUSQUEDA = "Shure ULXD4";
  return (
    <View style={e.app}>
      <View style={e.appCab}>
        <Text style={e.appTitulo}>Buscar equipos</Text>
        <Simbolo tam={26} />
      </View>
      <Animated.View style={[e.campo, entra(p, 0.15, 6)]}>
        <Icono n="buscar" tam={15} tinta={color.suave} />
        <View style={{ flexDirection: "row" }}>
          {BUSQUEDA.split("").map((c, i) => (
            <Animated.Text key={i} style={[e.campoTexto, { opacity: tramo(p, [0, f(0.4 + i * 0.075), f(0.42 + i * 0.075), 1], [0, 0, 1, 1]) }]}>
              {c}
            </Animated.Text>
          ))}
        </View>
      </Animated.View>
      <Animated.View
        style={[
          e.sugerencia,
          {
            opacity: tramo(p, [0, f(1.35), f(1.55), f(2.3), f(2.5), 1], [0, 0, 1, 1, 0, 0]),
            transform: [{ translateY: tramo(p, [0, f(1.35), f(1.55), 1], [-6, -6, 0, 0]) }],
          },
        ]}
      >
        <View style={e.sugItem}>
          <Text style={e.negrita}>Shure ULXD4</Text>
          <Text style={e.fino}>Micrófonos inalámbricos · 4 compañías</Text>
        </View>
      </Animated.View>
      <Animated.View style={[e.tarjetaApp, entra(p, 2.4)]}>
        <View style={e.filaCab}>
          <Text style={e.negrita}>Tu rider</Text>
          <Text style={e.cuantos}>16 EQUIPOS</Text>
        </View>
        {[
          { n: 8, nombre: "Shure ULXD4", cat: "mic", s: 2.5 },
          { n: 6, nombre: "Shure PSM1000", cat: "iem", s: 3.2 },
          { n: 2, nombre: "Antena helicoidal", cat: "antena", s: 3.7 },
        ].map((x) => (
          <Animated.View key={x.nombre} style={[e.fila, desdeIzq(p, x.s)]}>
            <View style={e.filaIco}>
              <IconoCategoria cat={x.cat} tam={16} />
            </View>
            <Text style={[e.negrita, { flex: 1 }]} numberOfLines={1}>
              {x.nombre}
            </Text>
            <Animated.View style={[e.cant, salta(p, x.s + 0.2)]}>
              <Text style={e.cantTexto}>{x.n}</Text>
            </Animated.View>
          </Animated.View>
        ))}
      </Animated.View>
      <View style={{ flexDirection: "row", gap: 6 }}>
        <Animated.View style={[e.chip, salta(p, 4.3)]}>
          <Icono n="calendario" tam={12} tinta={color.acento} />
          <Text style={e.chipTexto}>sáb 13 – dom 14 dic</Text>
        </Animated.View>
        <Animated.View style={[e.chip, salta(p, 4.55)]}>
          <Icono n="lugar" tam={12} tinta={color.acento} />
          <Text style={e.chipTexto}>Laureles</Text>
        </Animated.View>
      </View>
      <Animated.View style={[e.botonApp, entra(p, 5)]}>
        <Text style={e.botonTexto}>Ver compañías con equipo libre</Text>
      </Animated.View>
    </View>
  );
}

// ---- 2 · Mira quién lo tiene libre
function EscenaMapa({ p }: { p: Animated.Value }) {
  const radar = useBucle(2400, 0.5);
  const pines = [
    { texto: "Shure ULXD4", left: "18%", top: "18%", s: 0.7, eq: false },
    { texto: "≈ Sennheiser EW-DX", left: "48%", top: "30%", s: 1.1, eq: true },
    { texto: "Shure ULXD4", left: "58%", top: "8%", s: 1.5, eq: false },
  ] as const;
  return (
    <View style={{ flex: 1 }}>
      <Fondo viewBox="0 0 300 300" preserveAspectRatio="xMidYMid slice">
        {() => (
          <>
          <Rect width="300" height="300" fill="#EDF0F6" />
          <Path d="M0 0h60c-8 50 12 90 0 150s-24 90-14 150H0z" fill="#E1E6F0" />
          <Path d="M300 0h-54c12 40-8 90 4 150s24 90 14 150h36z" fill="#E1E6F0" />
          <Path d="M70 60 L240 80 M60 170 L245 150 M120 0 L105 300 M190 0 L175 300" stroke="#FFFFFF" strokeWidth={4} fill="none" />
          <Path d="M95 300 C115 240 130 210 140 170 S152 100 172 60 S200 15 205 0" stroke="#BCCDF6" strokeWidth={7} fill="none" strokeLinecap="round" />
          </>
        )}
      </Fondo>
      <Animated.View style={[e.mapaChip, entra(p, 0.1, -6)]}>
        <Icono n="calendario" tam={13} tinta={color.acento} />
        <Text style={e.chipTexto}>sáb 13 – dom 14 dic · Laureles</Text>
      </Animated.View>
      <View style={[e.lugar, { left: "44%", top: "36%" }]}>
        <Animated.View style={[e.radar, { opacity: tramo(radar, [0, 0.5, 1], [0.9, 0, 0]), transform: [{ scale: tramo(radar, [0, 0.5, 1], [1, 5, 5]) }] }]} />
        <Animated.View
          style={[e.radar, { opacity: tramo(radar, [0, 0.5, 0.501, 1], [0, 0, 0.9, 0]), transform: [{ scale: tramo(radar, [0, 0.5, 0.501, 1], [1, 1, 1, 5]) }] }]}
        />
      </View>
      {pines.map((x) => (
        <Animated.View
          key={x.texto + x.left}
          style={[
            e.pin,
            x.eq && { backgroundColor: color.tinta },
            { left: x.left, top: x.top },
            {
              opacity: tramo(p, [0, f(x.s), f(x.s + 0.35), 1], [0, 0, 1, 1]),
              transform: [{ translateY: tramo(p, [0, f(x.s), f(x.s + 0.3), f(x.s + 0.45), 1], [-22, -22, 3, 0, 0]) }],
            },
          ]}
        >
          <Text style={e.pinTexto}>{x.texto}</Text>
        </Animated.View>
      ))}
      <Animated.View style={[e.hoja, { transform: [{ translateY: tramo(p, [0, f(2.2), f(2.8), 1], [190, 190, 0, 0]) }] }]}>
        <View style={e.agarre} />
        <Text style={e.negrita}>3 compañías con equipo libre</Text>
        <View style={e.compania}>
          <View style={e.avatar}>
            <Text style={e.avatarTexto}>SA</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={e.negrita}>Sonido Andino</Text>
            <Text style={e.fino}>★ 4,9 · a 2,4 km · Libre en tus fechas</Text>
          </View>
          <Animated.View style={salta(p, 3.9)}>
            <Icono n="corazon" tam={18} tinta={color.coral} />
          </Animated.View>
        </View>
        <View style={{ flexDirection: "row", gap: 5, flexWrap: "wrap" }}>
          {["Shure ULXD4 ×8", "Shure PSM1000 ×6"].map((r, i) => (
            <Animated.View key={r} style={[e.ref, salta(p, 2.9 + i * 0.15)]}>
              <Text style={e.refTexto}>{r}</Text>
            </Animated.View>
          ))}
        </View>
        <Animated.View style={[e.botonApp, { backgroundColor: color.whatsapp }, entra(p, 4.6, 6)]}>
          <IconoWhatsApp tam={15} />
          <Text style={e.botonTexto}>Cotizar por WhatsApp</Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

// ---- 3 · Cotiza por WhatsApp
function EscenaWhatsApp({ p }: { p: Animated.Value }) {
  const puntos = useBucle(1000, 0);
  return (
    <View style={{ flex: 1, backgroundColor: "#EFEAE2" }}>
      <View style={e.waCab}>
        <View style={e.waAvatar}>
          <Text style={[e.avatarTexto, { fontSize: 11 }]}>SA</Text>
        </View>
        <View>
          <Text style={[e.negrita, { color: "#FFFFFF" }]}>Sonido Andino</Text>
          <Text style={[e.fino, { color: "rgba(255,255,255,0.8)" }]}>en línea</Text>
        </View>
      </View>
      <View style={{ padding: 10, gap: 6 }}>
        <Animated.View style={[e.burbuja, e.mia, entra(p, 0.5, 8)]}>
          <Text style={e.burbujaTexto}>
            {"Hola Sonido Andino, vi su equipo en ENRENTA.\nLo necesito del sáb 13 al dom 14 dic en Laureles:\n• 8× Shure ULXD4\n• 6× Shure PSM1000\n• 2× Antena helicoidal\n¿Está disponible?"}
          </Text>
          <View style={e.hora}>
            <Text style={e.horaTexto}>10:24</Text>
            <Text style={[e.horaTexto, { color: "#8696A0" }]}>✓✓</Text>
            <Animated.Text style={[e.horaTexto, e.leido, { opacity: tramo(p, [0, f(1.7), f(1.75), 1], [0, 0, 1, 1]) }]}>✓✓</Animated.Text>
          </View>
        </Animated.View>
        <View>
          <Animated.View style={[e.escribiendo, { opacity: tramo(p, [0, f(2.3), f(2.35), f(3.55), f(3.6), 1], [0, 0, 1, 1, 0, 0]) }]}>
            {[0, 1, 2].map((k) => (
              <Animated.View
                key={k}
                style={[e.puntito, { transform: [{ translateY: tramo(puntos, [0, 0.15 + k * 0.15, 0.3 + k * 0.15, 0.45 + k * 0.15, 1], [0, 0, -3, 0, 0]) }] }]}
              />
            ))}
          </Animated.View>
          <Animated.View style={[e.burbuja, e.suya, entra(p, 3.6, 8)]}>
            <Text style={e.burbujaTexto}>¡Hola! Sí, lo tenemos libre ese fin de semana 🙌</Text>
          </Animated.View>
        </View>
        <Animated.View style={[e.burbuja, e.suya, entra(p, 4.5, 8)]}>
          <Text style={e.burbujaTexto}>Te paso el valor con transporte y técnico.</Text>
        </Animated.View>
      </View>
    </View>
  );
}

// ---- 4 · Queda apartado
function EscenaApartado({ p }: { p: Animated.Value }) {
  return (
    <View style={e.app}>
      <View style={e.appCab}>
        <Text style={e.appTitulo}>Mis solicitudes</Text>
        <Simbolo tam={26} />
      </View>
      <Animated.View style={[e.tarjetaApp, entra(p, 0.15)]}>
        <View style={e.compania}>
          <View style={e.avatar}>
            <Text style={e.avatarTexto}>SA</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={e.negrita}>Sonido Andino</Text>
            <Text style={e.fino}>sáb 13 – dom 14 dic · 16 equipos</Text>
          </View>
          <View style={{ width: 82, height: 24, alignItems: "flex-end", justifyContent: "center" }}>
            <Animated.View style={[e.estado, { backgroundColor: color.avisoSuave, opacity: tramo(p, [0, f(2.55), f(2.6), 1], [1, 1, 0, 0]) }]}>
              <Text style={[e.estadoTexto, { color: color.aviso }]}>Cotizando</Text>
            </Animated.View>
            <Animated.View style={[e.estado, { backgroundColor: color.okSuave }, salta(p, 2.6)]}>
              <Text style={[e.estadoTexto, { color: color.ok }]}>Rentada</Text>
            </Animated.View>
          </View>
        </View>
        <View style={e.track}>
          <View style={e.trackLinea} />
          <Animated.View style={[e.trackLinea, e.trackLleno, { transform: [{ scaleX: tramo(p, [0, f(0.5), f(2.5), 1], [0, 0, 1, 1]) }] }]} />
          {["Enviada", "Cotizada", "Rentada"].map((h, i) => (
            <View key={h} style={e.hito}>
              <View style={e.hitoGris}>
                <Animated.View style={[e.hitoVerde, salta(p, 0.5 + i)]} />
              </View>
              <Text style={e.mini}>{h}</Text>
            </View>
          ))}
        </View>
      </Animated.View>
      <Animated.View
        style={[
          e.sello,
          { opacity: tramo(p, [0, f(2.9), f(3.2), 1], [0, 0, 1, 1]), transform: [{ rotate: "-5deg" }, { scale: tramo(p, [0, f(2.9), f(3.25), f(3.4), 1], [2.2, 2.2, 0.95, 1, 1]) }] },
        ]}
      >
        <Text style={e.selloTexto}>APARTADO PARA TI</Text>
      </Animated.View>
      <Animated.View style={[{ flexDirection: "row", gap: 6 }, entra(p, 3.5)]}>
        {[
          ["vie", 12],
          ["sáb", 13],
          ["dom", 14],
          ["lun", 15],
        ].map(([d, n]) => {
          const on = n === 13 || n === 14;
          return (
            <View key={n} style={[e.dia, on && { backgroundColor: color.acento }]}>
              <Text style={[e.mini, on && { color: "rgba(255,255,255,0.85)" }]}>{d}</Text>
              <Text style={[e.negrita, { fontSize: 15 }, on && { color: "#FFFFFF" }]}>{n}</Text>
            </View>
          );
        })}
      </Animated.View>
      <Animated.View style={[{ flexDirection: "row", gap: 8, marginTop: "auto" }, entra(p, 4.4)]}>
        <View style={e.botonSec}>
          <Icono n="compartir" tam={14} tinta={color.acento} />
          <Text style={[e.negrita, { fontSize: 12 }]}>Cotización PDF</Text>
        </View>
        <View style={e.botonSec}>
          <Text style={{ color: "#F0A52A", fontSize: 13 }}>★</Text>
          <Text style={[e.negrita, { fontSize: 12 }]}>Calificar</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const e = StyleSheet.create({
  ceja: { fontFamily: fuente[700], fontSize: 11, letterSpacing: 1.8, color: color.acento },
  h2: { fontFamily: fuente[600], fontSize: 27, lineHeight: 31, letterSpacing: -0.8, color: color.tinta },
  numeros: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  linea: { position: "absolute", left: 18, right: 18, height: 2, borderRadius: 1, backgroundColor: color.lineaFuerte },
  num: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: color.superficie, borderWidth: 1.5, borderColor: color.lineaFuerte },
  numOn: { backgroundColor: color.acento, borderColor: color.acento, transform: [{ scale: 1.1 }] },
  numHecho: { backgroundColor: color.acentoSuave, borderColor: color.acentoSuave },
  numTexto: { fontFamily: fuente[700], fontSize: 14, color: color.suave },
  barra: { height: 4, borderRadius: 2, backgroundColor: color.acentoSuave, overflow: "hidden" },
  barraLlena: { flex: 1, backgroundColor: color.acento, transformOrigin: "left" },
  escenario: {
    height: 330,
    borderRadius: 26,
    overflow: "hidden",
    backgroundColor: color.fondo,
    borderWidth: 6,
    borderColor: color.tinta,
    shadowColor: color.acento,
    shadowOpacity: 0.25,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  app: { flex: 1, padding: 12, gap: 9 },
  appCab: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  appTitulo: { fontFamily: fuente[600], fontSize: 18, letterSpacing: -0.4, color: color.tinta },
  campo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 38,
    paddingHorizontal: 12,
    borderRadius: radio.pildora,
    backgroundColor: color.superficie,
    borderWidth: 1.5,
    borderColor: "rgba(59,91,219,0.45)",
  },
  campoTexto: { fontFamily: fuente[500], fontSize: 13.5, color: color.tinta },
  sugerencia: { position: "absolute", top: 92, left: 12, right: 12, zIndex: 2, padding: 6, borderRadius: 14, backgroundColor: color.superficie, borderWidth: 1, borderColor: color.linea },
  sugItem: { padding: 8, borderRadius: 10, backgroundColor: color.acentoSuave, gap: 1 },
  negrita: { fontFamily: fuente[600], fontSize: 12.5, color: color.tinta },
  fino: { fontFamily: fuente[400], fontSize: 10.5, color: color.suave },
  mini: { fontFamily: fuente[400], fontSize: 9.5, color: color.suave },
  tarjetaApp: { padding: 10, borderRadius: 16, backgroundColor: color.superficie, gap: 2, borderWidth: 1, borderColor: color.linea },
  filaCab: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 4 },
  cuantos: { fontFamily: fuente[700], fontSize: 9.5, letterSpacing: 0.8, color: color.acento },
  fila: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 5, borderTopWidth: 1, borderTopColor: color.linea },
  filaIco: { width: 28, height: 28, borderRadius: 9, backgroundColor: color.acentoSuave, alignItems: "center", justifyContent: "center" },
  cant: { minWidth: 30, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radio.pildora, backgroundColor: color.superficie2, alignItems: "center" },
  cantTexto: { fontFamily: fuente[700], fontSize: 12, color: color.tinta },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: radio.pildora, backgroundColor: color.superficie, borderWidth: 1, borderColor: color.linea },
  chipTexto: { fontFamily: fuente[500], fontSize: 11, color: color.tinta },
  botonApp: { flexDirection: "row", gap: 7, height: 38, borderRadius: radio.pildora, backgroundColor: color.acento, alignItems: "center", justifyContent: "center", marginTop: "auto" },
  botonTexto: { fontFamily: fuente[600], fontSize: 12.5, color: "#FFFFFF" },
  // mapa
  mapaChip: { position: "absolute", top: 8, left: 8, right: 8, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: radio.pildora, backgroundColor: "rgba(255,255,255,0.95)" },
  lugar: { position: "absolute", width: 14, height: 14, borderRadius: 7, backgroundColor: color.coral, borderWidth: 3, borderColor: "#FFFFFF" },
  radar: { position: "absolute", left: -3, top: -3, width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: color.coral },
  pin: { position: "absolute", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 9, backgroundColor: color.acento },
  pinTexto: { fontFamily: fuente[600], fontSize: 10, color: "#FFFFFF" },
  hoja: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    paddingTop: 6,
    gap: 8,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: color.superficie,
  },
  agarre: { alignSelf: "center", width: 34, height: 4, borderRadius: 2, backgroundColor: color.lineaFuerte },
  compania: { flexDirection: "row", alignItems: "center", gap: 9 },
  avatar: { width: 34, height: 34, borderRadius: 11, backgroundColor: color.acento, alignItems: "center", justifyContent: "center" },
  avatarTexto: { fontFamily: fuente[700], fontSize: 12, color: "#FFFFFF" },
  ref: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radio.pildora, backgroundColor: color.acentoSuave },
  refTexto: { fontFamily: fuente[600], fontSize: 10.5, color: color.acento },
  // whatsapp
  waCab: { flexDirection: "row", alignItems: "center", gap: 9, padding: 10, backgroundColor: color.whatsapp },
  waAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" },
  burbuja: { maxWidth: "88%", paddingHorizontal: 9, paddingTop: 6, paddingBottom: 16, borderRadius: 12 },
  mia: { alignSelf: "flex-end", backgroundColor: "#D9FDD3", borderTopRightRadius: 4 },
  suya: { alignSelf: "flex-start", backgroundColor: "#FFFFFF", borderTopLeftRadius: 4 },
  burbujaTexto: { fontFamily: fuente[400], fontSize: 11.5, lineHeight: 16, color: "#111B21" },
  hora: { position: "absolute", right: 8, bottom: 3, flexDirection: "row", alignItems: "center", gap: 3 },
  horaTexto: { fontFamily: fuente[500], fontSize: 9, color: "#667781" },
  leido: { position: "absolute", right: 0, color: "#53BDEB" },
  escribiendo: { position: "absolute", left: 0, top: 0, flexDirection: "row", gap: 3, padding: 11, borderRadius: 12, backgroundColor: "#FFFFFF" },
  puntito: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#8696A0" },
  // apartado
  estado: { position: "absolute", paddingHorizontal: 9, paddingVertical: 4, borderRadius: radio.pildora },
  estadoTexto: { fontFamily: fuente[700], fontSize: 10.5 },
  track: { flexDirection: "row", marginTop: 10 },
  trackLinea: { position: "absolute", left: "16.6%", right: "16.6%", top: 5, height: 2, backgroundColor: color.linea },
  trackLleno: { backgroundColor: color.ok, transformOrigin: "left" },
  hito: { flex: 1, alignItems: "center", gap: 5 },
  hitoGris: { width: 12, height: 12, borderRadius: 6, backgroundColor: color.lineaFuerte },
  hitoVerde: { width: 12, height: 12, borderRadius: 6, backgroundColor: color.ok },
  sello: {
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: color.ok,
    backgroundColor: "rgba(231,246,238,0.85)",
  },
  selloTexto: { fontFamily: fuente[700], fontSize: 12, letterSpacing: 1.2, color: color.ok },
  dia: { flex: 1, alignItems: "center", gap: 1, paddingVertical: 6, borderRadius: 11, backgroundColor: color.superficie, borderWidth: 1, borderColor: color.linea },
  botonSec: { flex: 1, flexDirection: "row", gap: 6, height: 36, alignItems: "center", justifyContent: "center", borderRadius: radio.pildora, backgroundColor: color.superficie, borderWidth: 1, borderColor: color.linea },
});
