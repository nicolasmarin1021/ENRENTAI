import { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View, type LayoutChangeEvent, type ScrollViewInstance } from "react-native";
import { adivinarCategoria, coincide, equiposPara, norm } from "@/lib/busqueda";
import { NOMBRE_CORTO, type Categoria, type EquipoPublico, type LugarPublico } from "@/lib/catalogo";
import { diasDeRenta, etiquetaDia, leerLocal, pesos, plural, textoFecha, ymdLocal } from "@/lib/formato";
import { MEDELLIN, type Punto } from "@/lib/geo";
import { nuevoId, type LugarPedido, type Necesidad } from "@/lib/pedido";
import { usePedido } from "@/lib/pedido";
import { Aviso, Boton, Campo, Cantidad, Chip, Segmentos, Tarjeta, Texto } from "@/ui/base";
import { Icono, IconoCategoria } from "@/ui/iconos";
import { Mapa } from "@/ui/mapa";
import { color, fuente, radio } from "@/tema";

// Pedido guiado de Explorar, en tres pasos (igual que la web): qué, cuándo y dónde.

// ============================================================================ Paso 1: ¿Qué?
export function PasoQue({
  categorias,
  equipos,
  onSiguiente,
}: {
  categorias: Categoria[];
  equipos: EquipoPublico[];
  onSiguiente: () => void;
}) {
  const { pedido, guardar } = usePedido();
  const { width } = useWindowDimensions();
  const [texto, setTexto] = useState("");
  const [enfocado, setEnfocado] = useState(false);
  const [preguntar, setPreguntar] = useState<string | null>(null); // texto que espera su categoría
  const nombreCat = (id: string) => categorias.find((c) => c.id === id)?.nombre ?? id;

  // Equipos publicados que coinciden con lo que escribe, agrupados por nombre.
  const sugerencias = useMemo(() => {
    const t = texto.trim();
    if (t.length < 2) return [];
    const grupos = new Map<string, { nombre: string; categoria: string; unidades: number; companias: Set<string>; desde: number }>();
    for (const e of equipos.filter((x) => coincide(t, x))) {
      const k = norm(e.nombre);
      const g = grupos.get(k) ?? { nombre: e.nombre, categoria: e.categoria_id, unidades: 0, companias: new Set<string>(), desde: Infinity };
      g.unidades += e.unidades;
      g.companias.add(e.compania_id);
      g.desde = Math.min(g.desde, e.precio_dia);
      grupos.set(k, g);
    }
    return [...grupos.values()].slice(0, 6);
  }, [texto, equipos]);

  function agregar(t: string, categoria: string) {
    const limpio = t.trim().replace(/\s+/g, " ");
    guardar((p) => {
      const ya = p.necesidades.find((n) => n.categoria === categoria && norm(n.texto) === norm(limpio));
      const necesidades: Necesidad[] = ya
        ? p.necesidades.map((n) => (n === ya ? { ...n, cantidad: n.cantidad + 1 } : n))
        : [...p.necesidades, { id: nuevoId(), texto: limpio, categoria, cantidad: 1 }];
      return { ...p, necesidades };
    });
    setTexto("");
    setPreguntar(null);
  }

  function alAgregarTexto() {
    const t = texto.trim();
    if (t.length < 2) return;
    const cat = adivinarCategoria(t, equipos);
    if (cat) agregar(t, cat);
    else setPreguntar(t);
  }

  const cambiarCantidad = (id: string, cantidad: number) =>
    guardar((p) => ({
      ...p,
      necesidades: p.necesidades.map((n) => (n.id === id ? { ...n, cantidad } : n)).filter((n) => n.cantidad > 0),
    }));

  const total = pedido.necesidades.reduce((a, n) => a + n.cantidad, 0);
  const enCategoria = (id: string) => pedido.necesidades.filter((n) => n.categoria === id).reduce((a, n) => a + n.cantidad, 0);
  const escribiendo = texto.trim().length >= 2;
  const anchoTipo = Math.floor((Math.min(width, 640) - 32 - 3 * 10) / 4);

  return (
    <>
      <Progreso paso={1} />
      <View style={{ gap: 8 }}>
        <Texto style={estilos.tituloPaso}>¿Qué necesitas rentar?</Texto>
        <Texto v="fino" style={estilos.subPaso}>
          Busca por marca o modelo, o elige un tipo de equipo.
        </Texto>
      </View>

      {/* Buscador en píldora: + agrega lo escrito al pedido. */}
      <View style={[estilos.buscador, enfocado && estilos.buscadorActivo]}>
        <Icono n="buscar" tam={20} tinta={color.tinta} />
        <TextInput
          value={texto}
          onChangeText={(v) => {
            setTexto(v);
            setPreguntar(null);
          }}
          onFocus={() => setEnfocado(true)}
          onBlur={() => setEnfocado(false)}
          onSubmitEditing={alAgregarTexto}
          returnKeyType="done"
          autoCorrect={false}
          placeholder="Shure Axient, PSM1000, consola…"
          placeholderTextColor="#9AA0AE"
          style={estilos.buscadorInput}
          accessibilityLabel="Equipo que necesitas"
        />
        {escribiendo ? (
          <Pressable onPress={alAgregarTexto} style={estilos.buscadorBoton} accessibilityRole="button" accessibilityLabel="Agregar al pedido" hitSlop={6}>
            <Icono n="mas" tam={18} tinta="#FFFFFF" grosor={2.4} />
          </Pressable>
        ) : null}
      </View>

      {preguntar ? (
        <View style={{ gap: 12 }}>
          <Texto>
            ¿Qué tipo de equipo es <Texto peso={600}>«{preguntar}»</Texto>?
          </Texto>
          <View style={estilos.chips}>
            {categorias.map((c) => (
              <Chip key={c.id} texto={NOMBRE_CORTO[c.id] ?? c.nombre} icono={<IconoCategoria cat={c.id} tam={16} />} onPress={() => agregar(preguntar, c.id)} />
            ))}
          </View>
        </View>
      ) : escribiendo ? (
        // Mientras escribe: los equipos publicados que coinciden.
        <View>
          {sugerencias.length ? (
            sugerencias.map((g, i) => (
              <Pressable
                key={g.nombre}
                onPress={() => agregar(g.nombre, g.categoria)}
                style={({ pressed }) => [estilos.fila, i > 0 && estilos.linea, pressed && { opacity: 0.6 }]}
                accessibilityRole="button"
                accessibilityLabel={`Agregar ${g.nombre}`}
              >
                <View style={estilos.circulo}>
                  <IconoCategoria cat={g.categoria} tam={20} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Texto peso={600}>{g.nombre}</Texto>
                  <Texto v="fino">
                    {plural(g.companias.size, "compañía", "compañías")} · desde {pesos(g.desde)} / 24 h
                  </Texto>
                </View>
                <Icono n="mas" tam={20} tinta={color.acento} grosor={2.2} />
              </Pressable>
            ))
          ) : (
            <Texto v="fino">No hay equipos publicados con «{texto.trim()}». Toca + para agregarlo igual.</Texto>
          )}
        </View>
      ) : (
        // Tipos de equipo: una cuadrícula de íconos (tocar uno lo agrega al pedido).
        <View style={{ gap: 12 }}>
          <Texto peso={600} style={{ fontSize: 16 }}>
            Por tipo de equipo
          </Texto>
          <View style={estilos.rejilla}>
            {categorias.map((c) => {
              const n = enCategoria(c.id);
              return (
                <Pressable
                  key={c.id}
                  onPress={() => agregar("", c.id)}
                  style={({ pressed }) => [estilos.tipo, { width: anchoTipo }, pressed && { transform: [{ scale: 0.95 }] }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Agregar ${c.nombre}${n ? `, ya tienes ${n}` : ""}`}
                >
                  <View style={[estilos.tipoIcono, n > 0 && { backgroundColor: color.acento }]}>
                    <IconoCategoria cat={c.id} tam={26} tinta={n > 0 ? "#FFFFFF" : color.acento} />
                  </View>
                  <Texto peso={500} style={estilos.tipoTexto} numberOfLines={2}>
                    {NOMBRE_CORTO[c.id] ?? c.nombre}
                  </Texto>
                  {n > 0 ? (
                    <View style={estilos.insignia}>
                      <Text style={estilos.insigniaTexto}>{n}</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {pedido.necesidades.length > 0 ? (
        <View>
          <View style={{ flexDirection: "row", alignItems: "baseline", marginBottom: 4 }}>
            <Texto peso={600} style={{ fontSize: 16, flex: 1 }}>
              Tu pedido
            </Texto>
            <Texto v="fino">{plural(total, "equipo", "equipos")}</Texto>
          </View>
          {pedido.necesidades.map((n) => {
            const { exactos, alternativas } = equiposPara(n, equipos);
            const lista = exactos.length ? exactos : alternativas;
            const comps = new Set(lista.map((e) => e.compania_id)).size;
            const estado = !lista.length
              ? "Aún no hay de este tipo en Medellín"
              : exactos.length || !n.texto
                ? `En ${plural(comps, "compañía", "compañías")}`
                : `≈ Equivalentes en ${plural(comps, "compañía", "compañías")}`;
            return (
              <View key={n.id} style={[estilos.fila, estilos.linea]}>
                <View style={estilos.circulo}>
                  <IconoCategoria cat={n.categoria} tam={20} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Texto peso={600} numberOfLines={1}>
                    {n.texto || nombreCat(n.categoria)}
                  </Texto>
                  <Texto v="fino" numberOfLines={1}>
                    {estado}
                  </Texto>
                </View>
                <Cantidad valor={n.cantidad} onCambio={(v) => cambiarCantidad(n.id, v)} nombre={n.texto || nombreCat(n.categoria)} />
              </View>
            );
          })}
        </View>
      ) : null}

      <Boton titulo={total ? `Continuar · ${plural(total, "equipo", "equipos")}` : "Continuar"} bloque onPress={onSiguiente} deshabilitado={!total} />
    </>
  );
}

// Barra de los 3 pasos del pedido.
export function Progreso({ paso }: { paso: 1 | 2 | 3 }) {
  return (
    <View style={{ gap: 8 }} accessibilityLabel={`Paso ${paso} de 3`}>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={[estilos.segmento, i <= paso && { backgroundColor: color.acento }]} />
        ))}
      </View>
      <Texto v="etiqueta">
        Paso {paso} de 3 · {["Qué", "Cuándo", "Dónde"][paso - 1]}
      </Texto>
    </View>
  );
}

// ============================================================================ Paso 2: ¿Cuándo?
const HORAS = Array.from({ length: 36 }, (_, i) => {
  const h = 6 + Math.floor(i / 2);
  return `${String(h).padStart(2, "0")}:${i % 2 ? "30" : "00"}`;
}); // 06:00 a 23:30

// Los próximos 60 días, empezando hoy.
function proximosDias() {
  const lista: string[] = [];
  const d = new Date();
  for (let i = 0; i < 60; i++) {
    lista.push(ymdLocal(d));
    d.setDate(d.getDate() + 1);
  }
  return lista;
}

function ElegirFechaHora({ titulo, valor, onCambio, desde }: { titulo: string; valor: string; onCambio: (v: string) => void; desde?: string }) {
  const [dias] = useState(proximosDias);
  const [fecha, hora] = (valor || "T").split("T");
  const visibles = desde ? dias.filter((d) => d >= desde) : dias;
  const refDias = useRef<ScrollViewInstance>(null);
  const refHoras = useRef<ScrollViewInstance>(null);
  // Al abrir, cada fila se desplaza hasta el día y la hora elegidos (si no, quedarían fuera de la vista).
  const x = (e: LayoutChangeEvent) => Math.max(0, e.nativeEvent.layout.x - 24);
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
        <Texto v="etiqueta">{titulo}</Texto>
        <Texto peso={600} tono={color.acento}>
          {valor ? textoFecha(valor) : "Elige día y hora"}
        </Texto>
      </View>
      <ScrollView ref={refDias} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.carril}>
        {visibles.map((d) => (
          <View key={d} onLayout={d === fecha ? (e) => refDias.current?.scrollTo({ x: x(e), animated: false }) : undefined}>
            <Chip texto={etiquetaDia(d)} activo={d === fecha} onPress={() => onCambio(`${d}T${hora || "10:00"}`)} />
          </View>
        ))}
      </ScrollView>
      <ScrollView ref={refHoras} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.carril}>
        {HORAS.map((h) => (
          <View key={h} onLayout={h === hora ? (e) => refHoras.current?.scrollTo({ x: x(e), animated: false }) : undefined}>
            <Chip texto={h} activo={h === hora} onPress={() => onCambio(`${fecha || visibles[0]}T${h}`)} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export function PasoCuando({ onSiguiente, onAtras }: { onSiguiente: () => void; onAtras: () => void }) {
  const { pedido, guardar } = usePedido();
  const [error, setError] = useState("");
  const dias = diasDeRenta(pedido.entrega, pedido.recogida);
  const a = leerLocal(pedido.entrega);
  const b = leerLocal(pedido.recogida);
  const horas = a && b ? (+b - +a) / 36e5 : 0;

  const set = (cual: "entrega" | "recogida", v: string) => {
    setError("");
    guardar((p) => ({ ...p, [cual]: v }));
  };

  function continuar() {
    if (!a || !b) return setError("Elige el día y la hora de entrega y de recogida.");
    if (a < new Date()) return setError("La entrega debe ser en el futuro.");
    if (dias < 1) return setError("La recogida debe ser después de la entrega.");
    onSiguiente();
  }

  return (
    <>
      <Progreso paso={2} />
      <View style={{ gap: 8 }}>
        <Texto style={estilos.tituloPaso}>¿Cuándo los necesitas?</Texto>
        <Texto v="fino" style={estilos.subPaso}>
          Se cobra un día por cada 24 horas entre la entrega y la recogida.
        </Texto>
      </View>
      <Tarjeta style={{ gap: 20 }}>
        <ElegirFechaHora titulo="Entrega" valor={pedido.entrega} onCambio={(v) => set("entrega", v)} />
        <ElegirFechaHora
          titulo="Recogida"
          valor={pedido.recogida}
          onCambio={(v) => set("recogida", v)}
          desde={pedido.entrega.split("T")[0] || undefined}
        />
        {dias > 0 ? (
          <Aviso tono="ok" texto={`${plural(dias, "día", "días")} de renta (${String(Math.round(horas * 10) / 10).replace(".", ",")} h)`} />
        ) : null}
        {error ? <Aviso tono="mal" texto={error} /> : null}
      </Tarjeta>
      <Boton titulo="Continuar" bloque onPress={continuar} />
      <Boton titulo="Atrás" tipo="enlace" onPress={onAtras} style={{ alignSelf: "center" }} />
    </>
  );
}

// ============================================================================ Paso 3: ¿Dónde?
// Nombre corto para la píldora del mapa: "Centro de Espectáculos La Macarena" → "La Macarena".
function nombreCorto(n: string) {
  const limpio = n.replace(/\s*\(.*\)$/, "");
  const sin = limpio.replace(/^(Centro de Espectáculos|Coliseo|Estadio|Parque de los|Parque|Plaza|Teatro|Jardín)\s+/i, "");
  const base = sin.split(" ").length >= 2 ? sin : limpio; // "Parque Norte" se queda así
  return base.length > 20 ? `${base.slice(0, 18).trim()}…` : base;
}

export function PasoDonde({ lugares, onSiguiente, onAtras }: { lugares: LugarPublico[]; onSiguiente: () => void; onAtras: () => void }) {
  const { pedido, guardar } = usePedido();
  const propio = pedido.lugar && !pedido.lugar.id ? pedido.lugar : null;
  const [modo, setModo] = useState<"lista" | "otro">(propio || !lugares.length ? "otro" : "lista");
  const [nombre, setNombre] = useState(propio?.nombre ?? "");
  const [direccion, setDireccion] = useState(propio?.direccion ?? "");
  const [pin, setPin] = useState<Punto | null>(propio ? { lat: propio.lat, lng: propio.lng } : null);
  const [error, setError] = useState("");

  function elegir(l: LugarPublico) {
    setError("");
    guardar((p) => ({ ...p, lugar: { id: l.id, nombre: l.nombre, direccion: l.direccion ?? undefined, lat: l.lat, lng: l.lng } }));
  }

  function continuar() {
    if (modo === "lista") {
      if (!pedido.lugar?.id) return setError("Elige el lugar del show.");
      guardar((p) => ({ ...p, listo: true }));
      return onSiguiente();
    }
    if (nombre.trim().length < 2) return setError("Escribe el nombre del lugar.");
    if (direccion.trim().length < 5) return setError("Escribe la dirección exacta del lugar.");
    if (!pin) return setError("Toca el mapa donde queda la entrada del lugar.");
    const lugar: LugarPedido = { nombre: nombre.trim(), direccion: direccion.trim(), lat: pin.lat, lng: pin.lng };
    guardar((p) => ({ ...p, lugar, listo: true }));
    onSiguiente();
  }

  return (
    <>
      <Progreso paso={3} />
      <View style={{ gap: 8 }}>
        <Texto style={estilos.tituloPaso}>¿Dónde es el show?</Texto>
        <Texto v="fino" style={estilos.subPaso}>
          Con el lugar calculamos la distancia a cada bodega y el costo de entrega.
        </Texto>
      </View>
      {lugares.length > 0 ? (
        <Segmentos
          opciones={[
            { id: "lista", texto: "Un lugar conocido" },
            { id: "otro", texto: "Otro lugar" },
          ]}
          valor={modo}
          onCambio={(m) => {
            setModo(m);
            setError("");
          }}
        />
      ) : null}

      {modo === "lista" ? (
        <View style={{ gap: 8 }} accessibilityRole="radiogroup">
          {/* Los lugares en el mapa: tocar uno lo elige; elegirlo en la lista lleva el mapa hasta él. */}
          <Mapa
            centro={MEDELLIN}
            delta={0.16}
            ajustar
            margen={{ top: 50, right: 60, bottom: 50, left: 60 }}
            marcadores={lugares.map((l) => ({ id: l.id, lat: l.lat, lng: l.lng, texto: nombreCorto(l.nombre), forma: "punto" as const }))}
            activo={pedido.lugar?.id ?? null}
            onMarcador={(id) => {
              const l = lugares.find((x) => x.id === id);
              if (l) elegir(l);
            }}
            foco={pedido.lugar?.id ? pedido.lugar : null}
            style={{ height: 250, borderRadius: radio.lg, marginBottom: 6 }}
          />
          {pedido.lugar?.id ? (
            <Texto v="fino" style={{ textAlign: "center" }}>
              Elegiste <Texto v="fino" peso={600} tono={color.tinta}>{pedido.lugar.nombre}</Texto>
            </Texto>
          ) : (
            <Texto v="fino" style={{ textAlign: "center" }}>
              Toca un lugar en el mapa o en la lista.
            </Texto>
          )}
          {lugares.map((l) => {
            const activo = pedido.lugar?.id === l.id;
            return (
              <Pressable
                key={l.id}
                accessibilityRole="radio"
                accessibilityState={{ selected: activo }}
                onPress={() => elegir(l)}
                style={[estilos.lugar, activo && estilos.lugarActivo]}
              >
                <View style={[estilos.radio, activo && estilos.radioActivo]}>{activo ? <View style={estilos.radioPunto} /> : null}</View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Texto peso={600}>{l.nombre}</Texto>
                  {l.direccion ? <Texto v="fino">{l.direccion}</Texto> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Tarjeta>
          <Campo etiqueta="Nombre del lugar" placeholder="Ej.: Finca La Esperanza" value={nombre} onChangeText={setNombre} />
          <Campo etiqueta="Dirección exacta" placeholder="Ej.: Cra. 43A # 1-50, El Poblado" value={direccion} onChangeText={setDireccion} />
          <Texto v="fino">Toca el mapa (o arrastra el pin) hasta la entrada del lugar.</Texto>
          <Mapa
            centro={pin ?? MEDELLIN}
            delta={pin ? 0.04 : 0.18}
            pin={pin}
            onPin={(p) => {
              setPin(p);
              setError("");
            }}
            style={{ height: 260 }}
          />
          {!pin ? <Boton titulo="Poner el pin en el centro de Medellín" tipo="enlace" onPress={() => setPin(MEDELLIN)} /> : null}
        </Tarjeta>
      )}

      {error ? <Aviso tono="mal" texto={error} /> : null}
      <Boton titulo="Ver disponibilidad" bloque onPress={continuar} />
      <Boton titulo="Atrás" tipo="enlace" onPress={onAtras} style={{ alignSelf: "center" }} />
    </>
  );
}

const estilos = StyleSheet.create({
  // Paso 1
  segmento: { flex: 1, height: 4, borderRadius: 2, backgroundColor: color.lineaFuerte },
  tituloPaso: { fontFamily: fuente[600], fontSize: 30, lineHeight: 35, letterSpacing: -0.8, color: color.tinta },
  subPaso: { fontSize: 15, lineHeight: 21 },
  buscador: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 56,
    paddingLeft: 18,
    paddingRight: 8,
    borderRadius: 28,
    backgroundColor: color.superficie,
    borderWidth: 1,
    borderColor: color.linea,
    shadowColor: "#101828",
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  buscadorActivo: { borderColor: color.acento, borderWidth: 1.5 },
  buscadorInput: { flex: 1, height: "100%", fontFamily: fuente[400], fontSize: 16, color: color.tinta, outlineWidth: 0 },
  buscadorBoton: { width: 40, height: 40, borderRadius: 20, backgroundColor: color.acento, alignItems: "center", justifyContent: "center" },
  fila: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  linea: { borderTopWidth: 1, borderTopColor: color.linea },
  circulo: { width: 42, height: 42, borderRadius: 21, backgroundColor: color.acentoSuave, alignItems: "center", justifyContent: "center" },
  rejilla: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tipo: {
    alignItems: "center",
    gap: 8,
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 4,
    borderRadius: 18,
    backgroundColor: color.superficie,
    borderWidth: 1,
    borderColor: color.linea,
  },
  tipoIcono: { width: 48, height: 48, borderRadius: 24, backgroundColor: color.acentoSuave, alignItems: "center", justifyContent: "center" },
  tipoTexto: { fontSize: 12.5, lineHeight: 16, textAlign: "center", minHeight: 32 },
  insignia: {
    position: "absolute",
    top: 6,
    right: 6,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: color.coral,
    alignItems: "center",
    justifyContent: "center",
  },
  insigniaTexto: { fontFamily: fuente[700], fontSize: 11.5, color: "#FFFFFF" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  carril: { gap: 8, paddingRight: 8 },
  lugar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: radio.md,
    backgroundColor: color.superficie,
    borderWidth: 1,
    borderColor: color.linea,
  },
  lugarActivo: { borderColor: color.acento, backgroundColor: color.acentoSuave },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: color.lineaFuerte, alignItems: "center", justifyContent: "center" },
  radioActivo: { borderColor: color.acento },
  radioPunto: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.acento },
});
