import { Animated, StyleSheet, Text, View } from "react-native";
import { Tarjeta, Texto } from "@/ui/base";
import { Icono } from "@/ui/iconos";
import { tramo, useBucle } from "@/ui/movimiento";
import { color, fuente, radio } from "@/tema";

// Inicio · lo que ENRENTA hace por las compañías: cuatro tarjetas con pequeñas animaciones en bucle
// (las mismas de la portada web). Datos de ejemplo.

const SOLICITUDES = [
  { que: "8× Shure ULXD4 · 2× antenas", donde: "Festival · Envigado · sáb 13 dic" },
  { que: "2× Consola digital 32 canales", donde: "Concierto · Laureles · vie 19 dic" },
  { que: "12× Cabeza móvil · 4× truss", donde: "Boda · El Poblado · sáb 27 dic" },
];
// Diciembre de 2026 empieza en martes (semana de lunes a domingo).
const RENTADOS = [5, 6, 12, 13, 14, 19, 20, 26, 27];
const BLOQUEADOS = [24, 25, 31];

function Celda({ titulo, texto, children }: { titulo: string; texto: string; children: React.ReactNode }) {
  return (
    <Tarjeta style={{ gap: 14, padding: 18 }}>
      <View style={{ gap: 4 }}>
        <Texto peso={600} style={{ fontSize: 17, letterSpacing: -0.3 }}>
          {titulo}
        </Texto>
        <Texto v="fino" style={{ fontSize: 14, lineHeight: 20 }}>
          {texto}
        </Texto>
      </View>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {children}
      </View>
    </Tarjeta>
  );
}

function Solicitudes() {
  const t = useBucle(9000, 0);
  const paso = 64;
  return (
    <View style={e.feed}>
      <Animated.View
        style={{ gap: 8, transform: [{ translateY: tramo(t, [0, 0.22, 0.33, 0.55, 0.66, 0.88, 1], [-3 * paso, -3 * paso, -2 * paso, -2 * paso, -paso, -paso, 0]) }] }}
      >
        {[...SOLICITUDES, ...SOLICITUDES].map((x, i) => (
          <View key={i} style={e.aviso}>
            <View style={e.avisoIco}>
              <Icono n="chat" tam={16} tinta={color.whatsapp} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={e.negrita} numberOfLines={1}>
                {x.que}
              </Text>
              <Text style={e.fino} numberOfLines={1}>
                {x.donde}
              </Text>
            </View>
            <View style={e.nueva}>
              <Text style={e.nuevaTexto}>NUEVA</Text>
            </View>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

function Agenda() {
  const t = useBucle(8000, 0.5);
  const celdas: (number | null)[] = [null, ...Array.from({ length: 31 }, (_, i) => i + 1)];
  while (celdas.length % 7) celdas.push(null);
  return (
    <View style={{ gap: 8 }}>
      <View style={e.calCab}>
        <Text style={e.negrita}>Diciembre 2026</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <View style={[e.leyenda, { backgroundColor: color.acento }]} />
          <Text style={e.fino}>Rentado</Text>
          <View style={[e.leyenda, { backgroundColor: color.lineaFuerte, marginLeft: 6 }]} />
          <Text style={e.fino}>Bloqueado</Text>
        </View>
      </View>
      <View style={e.cal}>
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
          <Text key={`d${i}`} style={[e.calDia, e.mini]}>
            {d}
          </Text>
        ))}
        {celdas.map((n, i) => {
          const r = n ? RENTADOS.indexOf(n) : -1;
          const a = 0.04 + r * 0.035;
          return (
            <View key={i} style={[e.calDia, n ? e.calCelda : null, n && BLOQUEADOS.includes(n) ? { backgroundColor: color.lineaFuerte } : null]}>
              {n ? <Text style={e.calNum}>{n}</Text> : null}
              {r >= 0 ? (
                <Animated.View
                  style={[
                    e.calRentado,
                    {
                      opacity: tramo(t, [0, a, a + 0.03, 0.84, 0.92, 1], [0, 0, 1, 1, 0, 0]),
                      transform: [{ scale: tramo(t, [0, a, a + 0.03, a + 0.06, 1], [0.6, 0.6, 1.15, 1, 1]) }],
                    },
                  ]}
                >
                  <Text style={[e.calNum, { color: "#FFFFFF" }]}>{n}</Text>
                </Animated.View>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function Pregunta() {
  const t = useBucle(9000, 0.8);
  const puntos = useBucle(1000, 0);
  return (
    <View style={e.chat}>
      <Text style={[e.mini, { letterSpacing: 1 }]}>PREGUNTA SOBRE SHURE ULXD4</Text>
      <Animated.View style={[e.q, { opacity: tramo(t, [0, 0.04, 0.09, 0.9, 0.97, 1], [0, 0, 1, 1, 0, 0]) }]}>
        <Text style={e.qTexto}>¿Los micrófonos traen baterías recargables?</Text>
      </Animated.View>
      <View style={{ alignItems: "flex-end" }}>
        <Animated.View style={[e.dots, { opacity: tramo(t, [0, 0.2, 0.24, 0.44, 0.47, 1], [0, 0, 1, 1, 0, 0]) }]}>
          {[0, 1, 2].map((k) => (
            <Animated.View
              key={k}
              style={[e.puntito, { transform: [{ translateY: tramo(puntos, [0, 0.15 + k * 0.15, 0.3 + k * 0.15, 0.45 + k * 0.15, 1], [0, 0, -3, 0, 0]) }] }]}
            />
          ))}
        </Animated.View>
        <Animated.View style={[e.a, { opacity: tramo(t, [0, 0.45, 0.51, 0.9, 0.97, 1], [0, 0, 1, 1, 0, 0]) }]}>
          <Text style={[e.qTexto, { color: "#FFFFFF" }]}>Sí, cada uno con dos baterías y su cargador 🔋</Text>
        </Animated.View>
      </View>
    </View>
  );
}

function Confianza() {
  const t = useBucle(4000, 0.5);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
      <View style={e.escudo}>
        <Animated.View style={[e.escudoOnda, { opacity: tramo(t, [0, 1], [0.5, 0]), transform: [{ scale: tramo(t, [0, 1], [1, 1.5]) }] }]} />
        <Icono n="escudo" tam={36} tinta="#FFFFFF" grosor={1.7} />
      </View>
      <View style={{ gap: 7, flex: 1 }}>
        <View style={e.verificada}>
          <Icono n="check" tam={12} tinta={color.ok} grosor={3} />
          <Text style={[e.negrita, { color: color.ok }]}>Compañía verificada</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          {[0, 1, 2, 3, 4].map((k) => (
            <Animated.Text
              key={k}
              style={[e.estrella, { transform: [{ scale: tramo(t, [0, 0.05 + k * 0.04, 0.1 + k * 0.04, 0.14 + k * 0.04, 1], [0.6, 0.6, 1.25, 1, 1]) }] }]}
            >
              ★
            </Animated.Text>
          ))}
          <Text style={e.nota}>4,9</Text>
        </View>
        <Text style={e.fino}>Calificaciones de clientes que ya rentaron</Text>
      </View>
    </View>
  );
}

export function Companias() {
  return (
    <View style={{ gap: 14 }}>
      <View style={{ gap: 8 }}>
        <Text style={e.ceja}>SI TIENES EQUIPOS</Text>
        <Text style={e.h2}>
          Tu bodega, abierta a <Text style={{ color: color.acento }}>toda Medellín</Text>
        </Text>
        <Texto v="fino" style={{ fontSize: 15, lineHeight: 21 }}>
          Publica tu inventario una vez. ENRENTA se lo muestra a quien lo busca en las fechas que tienes libres.
        </Texto>
      </View>
      <Celda titulo="Solicitudes con todo el detalle" texto="Cada pedido llega con el rider, las fechas y el lugar del show. Respondes por WhatsApp.">
        <Solicitudes />
      </Celda>
      <Celda titulo="Tu agenda, siempre al día" texto="Lo que marcas como rentado o bloqueado deja de aparecer como libre en esas fechas.">
        <Agenda />
      </Celda>
      <Celda titulo="Preguntas antes de cotizar" texto="Los clientes te escriben por el chat de ENRENTA y resuelves sus dudas antes de que pidan la cotización.">
        <Pregunta />
      </Celda>
      <Celda titulo="Verificada y bien calificada" texto="La verificación y las calificaciones de tus clientes dan confianza a quien todavía no te conoce.">
        <Confianza />
      </Celda>
      <Texto v="fino" style={{ textAlign: "center", fontSize: 12 }}>
        Tarjetas con datos de ejemplo
      </Texto>
    </View>
  );
}

const e = StyleSheet.create({
  ceja: { fontFamily: fuente[700], fontSize: 11, letterSpacing: 1.8, color: color.acento },
  h2: { fontFamily: fuente[600], fontSize: 27, lineHeight: 31, letterSpacing: -0.8, color: color.tinta },
  negrita: { fontFamily: fuente[600], fontSize: 13, color: color.tinta },
  fino: { fontFamily: fuente[400], fontSize: 11.5, color: color.suave },
  mini: { fontFamily: fuente[600], fontSize: 9.5, color: color.suave },
  feed: { height: 132, overflow: "hidden" },
  aviso: { height: 56, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, borderRadius: 14, backgroundColor: color.superficie2 },
  avisoIco: { width: 34, height: 34, borderRadius: 11, backgroundColor: "#E3F4EF", alignItems: "center", justifyContent: "center" },
  nueva: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: radio.pildora, backgroundColor: color.acento },
  nuevaTexto: { fontFamily: fuente[700], fontSize: 9, letterSpacing: 0.8, color: "#FFFFFF" },
  calCab: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  leyenda: { width: 9, height: 9, borderRadius: 3 },
  cal: { flexDirection: "row", flexWrap: "wrap", rowGap: 4 },
  calDia: { width: `${100 / 7}%`, alignItems: "center", justifyContent: "center", textAlign: "center", height: 26 },
  calCelda: { borderRadius: 8, backgroundColor: color.superficie2, borderWidth: 2, borderColor: color.superficie },
  calNum: { fontFamily: fuente[500], fontSize: 11.5, color: color.tinta },
  calRentado: { ...StyleSheet.absoluteFill, borderRadius: 7, backgroundColor: color.acento, alignItems: "center", justifyContent: "center" },
  chat: { gap: 8, padding: 12, borderRadius: 16, backgroundColor: color.superficie2 },
  q: { alignSelf: "flex-start", maxWidth: "88%", paddingHorizontal: 11, paddingVertical: 8, borderRadius: 14, borderBottomLeftRadius: 4, backgroundColor: color.superficie },
  a: { maxWidth: "88%", paddingHorizontal: 11, paddingVertical: 8, borderRadius: 14, borderBottomRightRadius: 4, backgroundColor: color.acento },
  qTexto: { fontFamily: fuente[400], fontSize: 13, lineHeight: 18, color: color.tinta },
  dots: { position: "absolute", right: 0, top: 0, flexDirection: "row", gap: 3, padding: 11, borderRadius: 14, backgroundColor: color.superficie },
  puntito: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#8696A0" },
  escudo: { width: 76, height: 76, borderRadius: 22, backgroundColor: color.acento, alignItems: "center", justifyContent: "center" },
  escudoOnda: { ...StyleSheet.absoluteFill, borderRadius: 22, borderWidth: 3, borderColor: color.acento },
  verificada: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radio.pildora, backgroundColor: color.okSuave },
  estrella: { fontSize: 20, color: "#F0A52A" },
  nota: { fontFamily: fuente[700], fontSize: 20, marginLeft: 8, color: color.tinta },
});
