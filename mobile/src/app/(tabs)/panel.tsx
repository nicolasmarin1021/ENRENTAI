import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { ConCompania } from "@/componentes/sin-compania";
import { TarjetaSolicitud } from "@/componentes/tarjeta-solicitud";
import { hoyCO, ocupacionDia, sumarDias } from "@/lib/agenda";
import { esRentada, movimientos, useDatosCompania, type DatosCompania } from "@/lib/datos-compania";
import { fechaCO, iniciales, pesos, rangoCO } from "@/lib/formato";
import { referencia, type ReservaFila } from "@/lib/reservas";
import { useSesion, type MiCompania } from "@/lib/sesion";
import { mensajeError, supabase } from "@/lib/supabase";
import { Aviso, Boton, Campo, Cargando, Encabezado, Pantalla, Texto } from "@/ui/base";
import { Estrellas, Icono } from "@/ui/iconos";
import { Ventana } from "@/ui/ventana";
import { color, fuente, radio } from "@/tema";

type Pestana = "pendientes" | "rentadas" | "resenas";
const NATIVO = Platform.OS !== "web";

export default function Panel() {
  return <ConCompania titulo="Panel">{(cid) => <PanelCompania cid={cid} />}</ConCompania>;
}

// Panel de la compañía, sintético: la próxima salida, tres indicadores y una lista a la vez
// (por confirmar, rentadas o reseñas) con acciones rápidas. Tocar una solicitud abre su detalle.
function PanelCompania({ cid }: { cid: string }) {
  const { compania } = useSesion();
  const datos = useDatosCompania(cid);
  return <PanelVista compania={compania} {...datos} />;
}

type PropsVista = DatosCompania & {
  compania: MiCompania | null;
  cargando: boolean;
  error: string;
  recargar: () => void | Promise<void>;
  ahora: number;
};

// Solo dibuja (los datos los trae PanelCompania).
export function PanelVista({ compania, equipos, reservas, bloqueos, resenas, cargando, error, recargar, ahora }: PropsVista) {
  const [elegida, setElegida] = useState<Pestana | null>(null);
  const [abierta, setAbierta] = useState<ReservaFila | null>(null);

  const vigente = (r: ReservaFila) => Date.parse(r.recogida) >= ahora;
  const pendientes = reservas.filter((r) => r.estado === "pendiente" && vigente(r));
  const rentadas = reservas.filter((r) => esRentada(r) && vigente(r));
  const pestana: Pestana = elegida ?? (pendientes.length ? "pendientes" : "rentadas");

  // Indicadores
  const mes = new Date(ahora - 5 * 3600 * 1000).toISOString().slice(0, 7);
  const contactosMes = reservas.filter((r) => r.creado.slice(0, 7) === mes).length;
  const ocupacion = ocupacion14(equipos, reservas, bloqueos);
  const promedio = resenas.length ? resenas.reduce((a, r) => a + r.estrellas, 0) / resenas.length : 0;

  // La próxima salida de equipo (entrega o retiro de una rentada).
  const proxima = rentadas.filter((r) => Date.parse(r.entrega) >= ahora).sort((a, b) => a.entrega.localeCompare(b.entrega))[0] ?? null;

  return (
    <Pantalla refrescando={cargando && reservas.length > 0} onRefrescar={recargar}>
      <Encabezado titulo="Panel" sub={compania ? `${compania.nombre}${compania.verificada ? " · verificada" : ""}` : undefined} />
      {error ? <Aviso tono="mal" texto={error} /> : null}

      {cargando && !reservas.length && !equipos.length ? (
        <Cargando texto="Cargando tu panel…" />
      ) : (
        <>
          {/* Próxima salida */}
          {proxima ? (
            <Pressable onPress={() => setAbierta(proxima)} style={({ pressed }) => [estilos.proxima, pressed && { opacity: 0.9 }]} accessibilityRole="button">
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Texto v="etiqueta" tono="rgba(255,255,255,0.7)">
                  Próxima salida
                </Texto>
                <View style={{ flex: 1 }} />
                <Texto v="fino" tono="rgba(255,255,255,0.7)">
                  {proxima.codigo}
                </Texto>
              </View>
              <Texto peso={600} tono="#FFFFFF" style={{ fontSize: 22, lineHeight: 28, letterSpacing: -0.4 }}>
                {fechaCO(proxima.entrega)}
              </Texto>
              <Texto tono="rgba(255,255,255,0.85)" numberOfLines={1}>
                {proxima.reserva_items.map((i) => `${i.cantidad}× ${i.nombre}`).join(", ")}
              </Texto>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Icono n={proxima.modalidad === "entrega" ? "camion" : "bodega"} tam={16} tinta="rgba(255,255,255,0.85)" />
                <Texto v="fino" tono="rgba(255,255,255,0.85)" numberOfLines={1} style={{ flex: 1 }}>
                  {proxima.modalidad === "entrega" ? `Entrega en ${proxima.lugar_nombre}` : "Lo retiran en tu bodega"} · {proxima.cliente_nombre || "Cliente"}
                </Texto>
              </View>
            </Pressable>
          ) : (
            <View style={estilos.sinProxima}>
              <Icono n="calendario" tam={20} tinta={color.suave} />
              <Texto v="fino" style={{ flex: 1 }}>
                No tienes salidas de equipo programadas.
              </Texto>
            </View>
          )}

          {/* Tres indicadores en una sola fila */}
          <View style={estilos.indicadores}>
            <Indicador valor={String(contactosMes)} texto="Contactos este mes" />
            <View style={estilos.separador} />
            <Indicador valor={`${ocupacion}%`} texto="Ocupación 14 días" onPress={() => router.navigate("/inventario")} />
            <View style={estilos.separador} />
            <Indicador valor={resenas.length ? promedio.toFixed(1).replace(".", ",") : "—"} texto={resenas.length ? `★ ${resenas.length} ${resenas.length === 1 ? "reseña" : "reseñas"}` : "Sin reseñas"} onPress={() => setElegida("resenas")} />
          </View>

          {/* Una lista a la vez */}
          <View style={estilos.pestanas} accessibilityRole="tablist">
            <PestanaBoton texto="Pendientes" cuenta={pendientes.length} activa={pestana === "pendientes"} alerta onPress={() => setElegida("pendientes")} />
            <PestanaBoton texto="Rentadas" cuenta={rentadas.length} activa={pestana === "rentadas"} onPress={() => setElegida("rentadas")} />
            <PestanaBoton texto="Reseñas" cuenta={resenas.length} activa={pestana === "resenas"} onPress={() => setElegida("resenas")} />
          </View>

          {pestana === "resenas" ? (
            resenas.length ? (
              <View style={estilos.lista}>
                {resenas.map((r, i) => (
                  <FilaResena key={r.id} r={r} primera={i === 0} onListo={recargar} />
                ))}
              </View>
            ) : (
              <Vacio texto="Cuando tus clientes te califiquen, sus reseñas aparecen aquí y puedes responderlas." />
            )
          ) : (pestana === "pendientes" ? pendientes : rentadas).length ? (
            <View style={estilos.lista}>
              {(pestana === "pendientes" ? pendientes : rentadas).map((r, i) => (
                <FilaSolicitud key={r.id} r={r} primera={i === 0} onAbrir={() => setAbierta(r)} onListo={recargar} />
              ))}
            </View>
          ) : (
            <Vacio
              texto={
                pestana === "pendientes"
                  ? "No tienes solicitudes por confirmar. Cuando un cliente te pida una cotización, aparece aquí y te escribe por WhatsApp."
                  : "Aquí verás las solicitudes que marcaste como rentadas hasta su fecha de recogida."
              }
            />
          )}
        </>
      )}

      {abierta ? (
        <Ventana visible onCerrar={() => setAbierta(null)} titulo={abierta.cliente_nombre || "Cliente"} sub={`${abierta.codigo} · ${rangoCO(abierta.entrega, abierta.recogida)}`}>
          <TarjetaSolicitud
            r={abierta}
            vista="compania"
            ahora={ahora}
            onCambio={() => {
              setAbierta(null);
              void recargar();
            }}
          />
        </Ventana>
      ) : null}
    </Pantalla>
  );
}

// % de unidades ocupadas (rentadas o bloqueadas) en los próximos 14 días.
function ocupacion14(equipos: DatosCompania["equipos"], reservas: ReservaFila[], bloqueos: DatosCompania["bloqueos"]) {
  const movs = movimientos(reservas, bloqueos);
  const hoy = hoyCO();
  const dias = Array.from({ length: 14 }, (_, i) => sumarDias(hoy, i));
  const capacidad = equipos.reduce((a, e) => a + e.unidades * dias.length, 0);
  const ocupado = equipos.reduce(
    (a, e) =>
      a +
      dias.reduce((b, d) => {
        const o = ocupacionDia(movs, e.id, d);
        return b + Math.min(e.unidades, o.usadas + o.bloqueadas);
      }, 0),
    0,
  );
  return capacidad ? Math.round((ocupado / capacidad) * 100) : 0;
}

function Indicador({ valor, texto, onPress }: { valor: string; texto: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [estilos.indicador, pressed && { opacity: 0.6 }]} accessibilityRole={onPress ? "button" : undefined}>
      <Text style={estilos.indicadorValor}>{valor}</Text>
      <Texto v="fino" style={{ fontSize: 12, lineHeight: 15, textAlign: "center" }} numberOfLines={2}>
        {texto}
      </Texto>
    </Pressable>
  );
}

function PestanaBoton({ texto, cuenta, activa, alerta = false, onPress }: { texto: string; cuenta: number; activa: boolean; alerta?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[estilos.pestana, activa && estilos.pestanaActiva]} accessibilityRole="tab" accessibilityState={{ selected: activa }}>
      <Texto peso={600} style={{ fontSize: 13.5 }} tono={activa ? color.tinta : color.suave} numberOfLines={1}>
        {texto}
      </Texto>
      {cuenta > 0 ? (
        <View style={[estilos.cuenta, alerta && { backgroundColor: color.coral }, !alerta && activa && { backgroundColor: color.acento }]}>
          <Text style={estilos.cuentaTexto}>{cuenta}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function Vacio({ texto }: { texto: string }) {
  return (
    <View style={estilos.vacio}>
      <Texto v="fino" style={{ textAlign: "center" }}>
        {texto}
      </Texto>
    </View>
  );
}

// Una solicitud en una línea; las por confirmar traen sus dos acciones a la mano.
function FilaSolicitud({ r, primera, onAbrir, onListo }: { r: ReservaFila; primera: boolean; onAbrir: () => void; onListo: () => void }) {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  const pendiente = r.estado === "pendiente";

  async function marcarRentada() {
    setOcupado(true);
    setError("");
    const { error: e } = await supabase.rpc("responder_reserva", { p_id: r.id, p_aceptar: true, p_motivo: null });
    setOcupado(false);
    if (e) return setError(mensajeError(e, "No pudimos guardar. Intenta de nuevo."));
    if (NATIVO) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onListo();
  }

  return (
    <View style={[estilos.solicitud, !primera && estilos.linea]}>
      <Pressable onPress={onAbrir} style={({ pressed }) => [estilos.fila, pressed && { opacity: 0.6 }]} accessibilityRole="button" accessibilityLabel={`Ver la solicitud ${r.codigo}`}>
        <View style={estilos.avatar}>
          <Text style={estilos.avatarTexto}>{iniciales(r.cliente_nombre || "Cliente")}</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
            <Texto peso={600} numberOfLines={1} style={{ flex: 1 }}>
              {r.cliente_nombre || "Cliente"}
            </Texto>
            <Texto peso={600} style={{ fontSize: 14 }}>
              {pesos(referencia(r))}
            </Texto>
          </View>
          <Texto numberOfLines={1} style={{ fontSize: 14.5 }}>
            {r.reserva_items.map((i) => `${i.cantidad}× ${i.nombre}`).join(", ")}
          </Texto>
          <Texto v="fino" numberOfLines={1}>
            {rangoCO(r.entrega, r.recogida)} · {r.modalidad === "entrega" ? r.lugar_nombre : "retiro en bodega"}
          </Texto>
        </View>
        <Icono n="flecha" tam={16} tinta={color.suave} />
      </Pressable>
      {pendiente ? (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Boton titulo="No se concretó" tipo="secundario" chico onPress={onAbrir} deshabilitado={ocupado} style={{ flex: 1 }} />
          <Boton titulo="Marcar rentada" chico cargando={ocupado} onPress={marcarRentada} style={{ flex: 1 }} />
        </View>
      ) : null}
      {error ? <Aviso tono="mal" texto={error} /> : null}
    </View>
  );
}

// Una reseña; la compañía puede responderla (la respuesta es pública).
function FilaResena({ r, primera, onListo }: { r: DatosCompania["resenas"][number]; primera: boolean; onListo: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState(r.respuesta ?? "");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");

  async function guardar() {
    setOcupado(true);
    setError("");
    const { error: e } = await supabase.rpc("responder_resena", { p_resena: r.id, p_texto: texto.trim() || null });
    setOcupado(false);
    if (e) return setError(mensajeError(e, "No pudimos guardar tu respuesta. Intenta de nuevo."));
    setAbierto(false);
    onListo();
  }

  return (
    <View style={[estilos.solicitud, !primera && estilos.linea]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={[estilos.avatar, { backgroundColor: color.superficie2 }]}>
          <Text style={[estilos.avatarTexto, { color: color.tinta }]}>{iniciales(r.autor_nombre)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Texto peso={600}>{r.autor_nombre}</Texto>
          <Texto v="fino">{fechaCO(r.creado).split(" · ")[0]}</Texto>
        </View>
        <Estrellas valor={r.estrellas} tam={12} />
      </View>
      {r.comentario ? <Texto style={{ paddingLeft: 56 }}>{r.comentario}</Texto> : null}
      <View style={{ paddingLeft: 56, gap: 8 }}>
        {abierto ? (
          <>
            <Campo etiqueta="Tu respuesta (pública)" multiline value={texto} onChangeText={(v) => setTexto(v.slice(0, 600))} />
            {error ? <Aviso tono="mal" texto={error} /> : null}
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Boton titulo="Publicar" chico cargando={ocupado} onPress={guardar} />
              <Boton titulo="Cancelar" tipo="enlace" onPress={() => setAbierto(false)} />
            </View>
          </>
        ) : r.respuesta ? (
          <Pressable onPress={() => setAbierto(true)} style={estilos.respuesta} accessibilityRole="button" accessibilityLabel="Editar tu respuesta">
            <Texto v="fino" peso={600} tono={color.tinta}>
              Tu respuesta
            </Texto>
            <Texto v="fino">{r.respuesta}</Texto>
          </Pressable>
        ) : (
          <Boton titulo="Responder" tipo="suave" chico onPress={() => setAbierto(true)} />
        )}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  proxima: { backgroundColor: color.tinta, borderRadius: radio.lg, padding: 18, gap: 6 },
  sinProxima: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: radio.lg,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: color.lineaFuerte,
  },
  indicadores: { flexDirection: "row", alignItems: "center", backgroundColor: color.superficie, borderRadius: radio.lg, paddingVertical: 14, borderWidth: 1, borderColor: color.linea },
  indicador: { flex: 1, alignItems: "center", gap: 4, paddingHorizontal: 4 },
  indicadorValor: { fontFamily: fuente[700], fontSize: 22, lineHeight: 28, color: color.tinta },
  separador: { width: 1, height: 34, backgroundColor: color.linea },
  pestanas: { flexDirection: "row", backgroundColor: color.superficie2, borderRadius: radio.pildora, padding: 3, gap: 2 },
  pestana: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 38, borderRadius: radio.pildora, paddingHorizontal: 6 },
  pestanaActiva: {
    backgroundColor: color.superficie,
    shadowColor: "#101828",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cuenta: { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, backgroundColor: color.suave, alignItems: "center", justifyContent: "center" },
  cuentaTexto: { fontFamily: fuente[700], fontSize: 11, color: "#FFFFFF" },
  lista: { backgroundColor: color.superficie, borderRadius: radio.lg, borderWidth: 1, borderColor: color.linea, overflow: "hidden" },
  solicitud: { padding: 14, gap: 10 },
  linea: { borderTopWidth: 1, borderTopColor: color.linea },
  fila: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: color.acentoSuave, alignItems: "center", justifyContent: "center" },
  avatarTexto: { fontFamily: fuente[700], fontSize: 15, color: color.acento },
  respuesta: { backgroundColor: color.superficie2, borderRadius: radio.sm, padding: 10, gap: 2 },
  vacio: { padding: 20, borderRadius: radio.lg, borderWidth: 1, borderStyle: "dashed", borderColor: color.lineaFuerte },
});
