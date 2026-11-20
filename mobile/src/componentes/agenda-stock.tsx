import * as Haptics from "expo-haptics";
import { useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { esFinDeSemana, diaSemana, finCO, hoyCO, inicioCO, mesCorto, numeroDia, ocupacionDia, sumarDias, textoDia } from "@/lib/agenda";
import { esRentada, movimientos, type Bloqueo, type EquipoInventario } from "@/lib/datos-compania";
import { fechaCO, plural, rangoCO } from "@/lib/formato";
import type { ReservaFila } from "@/lib/reservas";
import { supabase } from "@/lib/supabase";
import { Aviso, Boton, Cantidad, Chip, Texto } from "@/ui/base";
import { Ventana } from "@/ui/ventana";
import { color, fuente, radio } from "@/tema";

// Stock por día (como "Inventario y agenda" de la web): una fila por equipo y una columna por
// día; cada casilla dice cuántas unidades quedan libres. Al tocarla se ve qué la ocupa y se pueden
// bloquear unidades (mantenimiento, uso propio…).

const DIAS = 14;
const ANCHO_EQUIPO = 132;
const ANCHO_DIA = 48;
const ALTO_FILA = 60;
const MOTIVOS = ["Mantenimiento", "Uso propio", "Reparación", "Otro"];
const NATIVO = Platform.OS !== "web";

type Nivel = 0 | 1 | 2 | 3;
const NIVELES: Record<Nivel, { fondo: string; texto: string }> = {
  0: { fondo: color.superficie2, texto: color.tinta }, // todo libre
  1: { fondo: color.acentoSuave, texto: color.acento }, // hasta la mitad ocupada
  2: { fondo: "#FFE7C2", texto: "#7A4A00" }, // más de la mitad
  3: { fondo: "#FBD9D3", texto: color.mal }, // sin unidades libres
};

export function AgendaStock({
  equipos,
  reservas,
  bloqueos,
  onCambio,
}: {
  equipos: EquipoInventario[];
  reservas: ReservaFila[];
  bloqueos: Bloqueo[];
  onCambio: () => void;
}) {
  const hoy = hoyCO();
  const [desde, setDesde] = useState(hoy);
  const [celda, setCelda] = useState<{ e: EquipoInventario; dia: string } | null>(null);
  const dias = Array.from({ length: DIAS }, (_, i) => sumarDias(desde, i));
  const movs = movimientos(reservas, bloqueos);

  const estado = (e: EquipoInventario, d: string) => {
    const o = ocupacionDia(movs, e.id, d);
    const usadas = Math.min(e.unidades, o.usadas + o.bloqueadas);
    const r = e.unidades ? usadas / e.unidades : 0;
    const nivel: Nivel = r <= 0 ? 0 : r <= 0.5 ? 1 : r < 1 ? 2 : 3;
    return { ...o, libres: e.unidades - usadas, nivel };
  };

  return (
    <View style={{ gap: 12 }}>
      {/* Semana: ‹ Hoy › */}
      <View style={estilos.nav}>
        <Pressable
          onPress={() => setDesde(sumarDias(desde, -7) < hoy ? hoy : sumarDias(desde, -7))}
          disabled={desde <= hoy}
          style={[estilos.navBtn, desde <= hoy && { opacity: 0.35 }]}
          accessibilityRole="button"
          accessibilityLabel="Semana anterior"
        >
          <Text style={estilos.navFlecha}>‹</Text>
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Texto peso={600}>
            {numeroDia(dias[0])} {mesCorto(dias[0])} – {numeroDia(dias[DIAS - 1])} {mesCorto(dias[DIAS - 1])}
          </Texto>
          {desde !== hoy ? (
            <Pressable onPress={() => setDesde(hoy)} accessibilityRole="button">
              <Texto v="fino" peso={600} tono={color.acento}>
                Volver a hoy
              </Texto>
            </Pressable>
          ) : (
            <Texto v="fino">Desde hoy · 14 días</Texto>
          )}
        </View>
        <Pressable onPress={() => setDesde(sumarDias(desde, 7))} style={estilos.navBtn} accessibilityRole="button" accessibilityLabel="Semana siguiente">
          <Text style={estilos.navFlecha}>›</Text>
        </Pressable>
      </View>

      {/* La tabla: nombres fijos a la izquierda y los días se deslizan de lado. */}
      <View style={estilos.tabla}>
        <View style={{ width: ANCHO_EQUIPO }}>
          <View style={[estilos.cabezaDia, { alignItems: "flex-start", paddingLeft: 12 }]}>
            <Texto v="etiqueta">Equipo</Texto>
          </View>
          {equipos.map((e) => (
            <View key={e.id} style={[estilos.nombre, { height: ALTO_FILA }]}>
              <Texto peso={600} numberOfLines={2} style={{ fontSize: 13, lineHeight: 16 }}>
                {e.nombre}
              </Texto>
              <Texto v="fino" style={{ fontSize: 11.5 }}>
                {e.unidades} u{!e.activo ? " · en pausa" : ""}
              </Texto>
            </View>
          ))}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <View style={{ flexDirection: "row" }}>
              {dias.map((d) => (
                <View key={d} style={[estilos.cabezaDia, { width: ANCHO_DIA }]}>
                  <View style={[estilos.dia, d === hoy && { backgroundColor: color.acento }]}>
                    <Text style={[estilos.diaNombre, esFinDeSemana(d) && { color: color.coral }, d === hoy && { color: "#FFFFFF" }]}>{diaSemana(d)}</Text>
                    <Text style={[estilos.diaNumero, d === hoy && { color: "#FFFFFF" }]}>{numeroDia(d)}</Text>
                  </View>
                </View>
              ))}
            </View>
            {equipos.map((e) => (
              <View key={e.id} style={{ flexDirection: "row", height: ALTO_FILA, alignItems: "center" }}>
                {dias.map((d) => {
                  const s = estado(e, d);
                  const n = NIVELES[s.nivel];
                  return (
                    <Pressable
                      key={d}
                      onPress={() => {
                        if (NATIVO) Haptics.selectionAsync().catch(() => {});
                        setCelda({ e, dia: d });
                      }}
                      style={{ width: ANCHO_DIA, alignItems: "center" }}
                      accessibilityRole="button"
                      accessibilityLabel={`${e.nombre}, ${textoDia(d)}: ${s.libres} libres de ${e.unidades}${s.bloqueadas ? `, ${s.bloqueadas} bloqueadas` : ""}`}
                    >
                      {({ pressed }) => (
                        <View style={[estilos.celda, { backgroundColor: n.fondo }, pressed && { transform: [{ scale: 0.9 }] }]}>
                          <Text style={[estilos.celdaTexto, { color: n.texto }]}>{s.libres}</Text>
                          {s.bloqueadas ? <View style={estilos.punto} /> : null}
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Leyenda */}
      <View style={estilos.leyenda}>
        {([0, 1, 2, 3] as Nivel[]).map((k) => (
          <View key={k} style={estilos.leyendaItem}>
            <View style={[estilos.muestra, { backgroundColor: NIVELES[k].fondo }]} />
            <Texto v="fino" style={{ fontSize: 12 }}>
              {["Todo libre", "Hasta la mitad", "Más de la mitad", "Sin libres"][k]}
            </Texto>
          </View>
        ))}
        <View style={estilos.leyendaItem}>
          <View style={[estilos.muestra, { backgroundColor: color.superficie2 }]}>
            <View style={[estilos.punto, { top: 2, right: 2 }]} />
          </View>
          <Texto v="fino" style={{ fontSize: 12 }}>
            Con bloqueo
          </Texto>
        </View>
        <Texto v="fino" style={{ fontSize: 12 }}>
          El número es lo que queda libre.
        </Texto>
      </View>

      {celda ? (
        <DetalleDia
          e={celda.e}
          dia={celda.dia}
          reservas={reservas}
          bloqueos={bloqueos}
          libres={estado(celda.e, celda.dia).libres}
          onCerrar={() => setCelda(null)}
          onCambio={onCambio}
        />
      ) : null}
    </View>
  );
}

// Lo que pasa con un equipo un día: qué solicitudes rentadas y qué bloqueos lo ocupan, y el
// formulario para bloquear unidades desde ese día.
function DetalleDia({
  e,
  dia,
  reservas,
  bloqueos,
  libres,
  onCerrar,
  onCambio,
}: {
  e: EquipoInventario;
  dia: string;
  reservas: ReservaFila[];
  bloqueos: Bloqueo[];
  libres: number;
  onCerrar: () => void;
  onCambio: () => void;
}) {
  const a = +inicioCO(dia);
  const b = +finCO(dia);
  const cruza = (desde: string, hasta: string) => Date.parse(desde) < b && Date.parse(hasta) > a;
  const rentadas = reservas.filter((r) => esRentada(r) && cruza(r.entrega, r.recogida) && r.reserva_items.some((i) => i.equipo_id === e.id));
  const suyos = bloqueos.filter((x) => x.equipo_id === e.id && cruza(x.desde, x.hasta));
  const [cantidad, setCantidad] = useState(1);
  const [hasta, setHasta] = useState(dia);
  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const [ocupado, setOcupado] = useState(false);
  const [quitando, setQuitando] = useState<string | null>(null);
  const [error, setError] = useState("");
  const opcionesHasta = Array.from({ length: 14 }, (_, i) => sumarDias(dia, i));

  async function bloquear() {
    setOcupado(true);
    setError("");
    const { error: err } = await supabase
      .from("bloqueos")
      .insert({ equipo_id: e.id, cantidad, desde: inicioCO(dia).toISOString(), hasta: finCO(hasta).toISOString(), motivo });
    setOcupado(false);
    if (err) {
      return setError(
        err.code === "PGRST205" || err.code === "42P01"
          ? "Los bloqueos aún no están activados: falta ejecutar el SQL 0005_bloqueos.sql en Supabase."
          : "No pudimos guardar el bloqueo. Intenta de nuevo.",
      );
    }
    if (NATIVO) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onCambio();
    onCerrar();
  }

  async function quitar(id: string) {
    setQuitando(id);
    const { error: err } = await supabase.from("bloqueos").delete().eq("id", id);
    setQuitando(null);
    if (err) return setError("No pudimos quitar el bloqueo. Intenta de nuevo.");
    onCambio();
    onCerrar();
  }

  return (
    <Ventana visible onCerrar={onCerrar} titulo={e.nombre} sub={`${textoDia(dia)} · ${libres} de ${e.unidades} libres`}>
      {rentadas.length ? (
        <View style={{ gap: 8 }}>
          <Texto v="etiqueta">Rentadas ese día</Texto>
          {rentadas.map((r) => (
            <View key={r.id} style={estilos.item}>
              <Texto peso={600}>
                {r.reserva_items.filter((i) => i.equipo_id === e.id).reduce((s, i) => s + i.cantidad, 0)} u · {r.cliente_nombre || "Cliente"}
              </Texto>
              <Texto v="fino">
                {r.codigo} · {rangoCO(r.entrega, r.recogida)} · {r.modalidad === "entrega" ? r.lugar_nombre : "retiro en bodega"}
              </Texto>
            </View>
          ))}
        </View>
      ) : null}

      {suyos.length ? (
        <View style={{ gap: 8 }}>
          <Texto v="etiqueta">Bloqueos</Texto>
          {suyos.map((x) => (
            <View key={x.id} style={[estilos.item, { flexDirection: "row", alignItems: "center", gap: 10 }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Texto peso={600}>
                  {x.cantidad} u · {x.motivo}
                </Texto>
                <Texto v="fino">{rangoCO(x.desde, x.hasta)}</Texto>
              </View>
              <Boton titulo="Quitar" tipo="peligro" chico cargando={quitando === x.id} onPress={() => quitar(x.id)} />
            </View>
          ))}
        </View>
      ) : null}

      {!rentadas.length && !suyos.length ? <Texto v="fino">Nada ocupa este equipo ese día.</Texto> : null}

      <View style={estilos.bloquear}>
        <Texto v="subtitulo" style={{ fontSize: 16 }}>
          Bloquear unidades
        </Texto>
        <Texto v="fino">Las unidades bloqueadas no se pueden rentar en esas fechas.</Texto>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Texto peso={500}>Unidades</Texto>
          <Cantidad valor={cantidad} onCambio={setCantidad} min={1} max={e.unidades} nombre="unidades a bloquear" />
        </View>
        <Texto peso={500}>Hasta (incluido)</Texto>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {opcionesHasta.map((d, i) => (
            <Chip key={d} texto={i === 0 ? "Solo este día" : textoDia(d)} activo={hasta === d} onPress={() => setHasta(d)} />
          ))}
        </ScrollView>
        <Texto peso={500}>Motivo</Texto>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {MOTIVOS.map((m) => (
            <Chip key={m} texto={m} activo={motivo === m} onPress={() => setMotivo(m)} />
          ))}
        </View>
        {error ? <Aviso tono="mal" texto={error} /> : null}
        <Boton
          titulo={`Bloquear ${plural(cantidad, "unidad", "unidades")}${hasta === dia ? "" : ` hasta el ${textoDia(hasta)}`}`}
          bloque
          cargando={ocupado}
          onPress={bloquear}
        />
      </View>
    </Ventana>
  );
}

// Bloqueos que todavía no terminan.
export function ListaBloqueos({ bloqueos, equipos, onCambio }: { bloqueos: Bloqueo[]; equipos: EquipoInventario[]; onCambio: () => void }) {
  const [quitando, setQuitando] = useState<string | null>(null);
  if (!bloqueos.length) return null;
  const nombre = (id: string) => equipos.find((e) => e.id === id)?.nombre ?? "Equipo";
  return (
    <View style={{ gap: 4 }}>
      <Texto v="subtitulo" style={{ fontSize: 17 }}>
        Bloqueos activos
      </Texto>
      {bloqueos.map((x, i) => (
        <View key={x.id} style={[estilos.fila, i > 0 && estilos.linea]}>
          <View style={{ flex: 1, gap: 2 }}>
            <Texto peso={600} numberOfLines={1}>
              {x.cantidad} × {nombre(x.equipo_id)}
            </Texto>
            <Texto v="fino">
              {x.motivo} · {rangoCO(x.desde, x.hasta)}
            </Texto>
          </View>
          <Boton
            titulo="Quitar"
            tipo="peligro"
            chico
            cargando={quitando === x.id}
            onPress={async () => {
              setQuitando(x.id);
              await supabase.from("bloqueos").delete().eq("id", x.id);
              setQuitando(null);
              onCambio();
            }}
          />
        </View>
      ))}
    </View>
  );
}

// Salidas y regresos de equipo en las próximas 3 semanas.
export function SalidasRegresos({ reservas }: { reservas: ReservaFila[] }) {
  const hoy = hoyCO();
  const desde = +inicioCO(hoy);
  const hasta = +inicioCO(sumarDias(hoy, 21));
  const eventos = reservas
    .filter(esRentada)
    .flatMap((r) => [
      { cuando: r.entrega, sale: true, r },
      { cuando: r.recogida, sale: false, r },
    ])
    .filter((x) => Date.parse(x.cuando) >= desde && Date.parse(x.cuando) < hasta)
    .sort((x, y) => x.cuando.localeCompare(y.cuando));

  return (
    <View style={{ gap: 4 }}>
      <Texto v="subtitulo" style={{ fontSize: 17 }}>
        Salidas y regresos
      </Texto>
      <Texto v="fino" style={{ marginBottom: 4 }}>
        Próximas 3 semanas
      </Texto>
      {eventos.length ? (
        eventos.map(({ cuando, sale, r }, i) => (
          <View key={r.id + (sale ? "s" : "r")} style={[estilos.fila, i > 0 && estilos.linea]}>
            <View style={[estilos.flecha, { backgroundColor: sale ? color.acentoSuave : color.okSuave }]}>
              <Text style={{ fontFamily: fuente[700], fontSize: 16, color: sale ? color.acento : color.ok }}>{sale ? "↗" : "↙"}</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Texto peso={600}>
                {sale ? (r.modalidad === "entrega" ? "Sale a entrega" : "Lo retiran") : r.modalidad === "entrega" ? "Recogida" : "Lo devuelven"}
              </Texto>
              <Texto v="fino" numberOfLines={1}>
                {r.reserva_items.map((x) => `${x.cantidad}× ${x.nombre}`).join(", ")}
              </Texto>
              <Texto v="fino" numberOfLines={1}>
                {fechaCO(cuando)} · {r.modalidad === "entrega" ? r.lugar_nombre : "Tu bodega"}
              </Texto>
            </View>
          </View>
        ))
      ) : (
        <Texto v="fino">No hay entregas ni devoluciones en las próximas tres semanas.</Texto>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  nav: { flexDirection: "row", alignItems: "center", gap: 10 },
  navBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: color.superficie, borderWidth: 1, borderColor: color.linea, alignItems: "center", justifyContent: "center" },
  navFlecha: { fontFamily: fuente[600], fontSize: 22, lineHeight: 24, color: color.tinta, marginTop: -2 },
  tabla: { flexDirection: "row", backgroundColor: color.superficie, borderRadius: radio.lg, paddingVertical: 8, borderWidth: 1, borderColor: color.linea },
  cabezaDia: { height: 50, alignItems: "center", justifyContent: "center" },
  dia: { width: 40, paddingVertical: 4, borderRadius: 10, alignItems: "center" },
  diaNombre: { fontFamily: fuente[500], fontSize: 11, color: color.suave },
  diaNumero: { fontFamily: fuente[700], fontSize: 15, color: color.tinta },
  nombre: { justifyContent: "center", paddingLeft: 12, paddingRight: 6, borderRightWidth: 1, borderRightColor: color.linea, gap: 2 },
  celda: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  celdaTexto: { fontFamily: fuente[700], fontSize: 15 },
  punto: { position: "absolute", top: 4, right: 4, width: 7, height: 7, borderRadius: 4, backgroundColor: color.coral },
  leyenda: { flexDirection: "row", flexWrap: "wrap", gap: 12, alignItems: "center" },
  leyendaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  muestra: { width: 16, height: 16, borderRadius: 5 },
  item: { backgroundColor: color.superficie2, borderRadius: radio.md, padding: 12, gap: 2 },
  bloquear: { gap: 10, borderTopWidth: 1, borderTopColor: color.linea, paddingTop: 14 },
  fila: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  linea: { borderTopWidth: 1, borderTopColor: color.linea },
  flecha: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
});
