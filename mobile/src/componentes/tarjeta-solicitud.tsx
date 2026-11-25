import { useEffect, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { fechaCO, pesos, plural, rangoCO } from "@/lib/formato";
import { perfilDeSolicitud, type PerfilCliente } from "@/lib/perfil";
import { ESTADOS_RESERVA, RENTADA, referencia, type ReservaFila } from "@/lib/reservas";
import { mensajeError, supabase } from "@/lib/supabase";
import { usePreguntar } from "@/lib/chat";
import { compartirCotizacion, cotizacionDeSolicitud } from "@/lib/cotizacion";
import { Aviso, Boton, Campo, Etiqueta, Fila, Tarjeta, Texto } from "@/ui/base";
import { Estrellas, Icono } from "@/ui/iconos";
import { color, fuente, radio } from "@/tema";
import { CalificarCliente } from "./calificar-cliente";
import { TarjetaPerfil } from "./perfil-cliente";

export type MiResena = { estrellas: number; comentario: string | null };

// Pregunta antes de algo que no se puede deshacer (en la web del computador usa confirm).
function confirmar(titulo: string, texto: string, accion: string, si: () => void) {
  if (Platform.OS === "web") {
    if (window.confirm(`${titulo}\n\n${texto}`)) si();
    return;
  }
  Alert.alert(titulo, texto, [
    { text: "No", style: "cancel" },
    { text: accion, style: "destructive", onPress: si },
  ]);
}

// Una solicitud vista por el cliente o por la compañía (BETA: precio de referencia, sin cobros de ENRENTA).
export function TarjetaSolicitud({
  r,
  vista,
  resena = null,
  ahora,
  onCambio,
}: {
  r: ReservaFila;
  vista: "cliente" | "compania";
  resena?: MiResena | null;
  ahora: number;
  onCambio: () => void; // recargar la lista después de una acción
}) {
  const [detalle, setDetalle] = useState(false);
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [perfil, setPerfil] = useState<PerfilCliente | null>(null);

  // La compañía ve el perfil de quien le hizo la solicitud (si falta el SQL 0010, solo el nombre).
  useEffect(() => {
    if (vista !== "compania") return;
    let vivo = true;
    void perfilDeSolicitud(r.id).then((p) => {
      if (vivo) setPerfil(p);
    });
    return () => {
      vivo = false;
    };
  }, [r.id, vista]);
  const est = ESTADOS_RESERVA[r.estado] ?? { texto: r.estado, tono: "" as const };
  const futura = Date.parse(r.entrega) > ahora;
  const puedeCalificar = vista === "cliente" && !futura && RENTADA.includes(r.estado);
  const logistica =
    (r.modalidad === "entrega"
      ? `Entrega en ${r.lugar_nombre} el ${fechaCO(r.entrega)} · recogida ${fechaCO(r.recogida)}`
      : `Retiro en bodega${r.companias?.direccion_bodega ? ` (${r.companias.direccion_bodega})` : ""} el ${fechaCO(r.entrega)} · devolución ${fechaCO(r.recogida)}`) +
    (r.con_tecnico ? " · con técnico" : "");

  // La cotización formal en PDF (la misma que en la web), siempre disponible en la solicitud.
  async function bajarPDF() {
    setOcupado(true);
    setError(await compartirCotizacion(cotizacionDeSolicitud(r)));
    setOcupado(false);
  }

  // Conversar con el proveedor por el chat interno de ENRENTA.
  const chat = usePreguntar();
  const conversar = () => chat.preguntar(r.compania_id, r.companias?.nombre ?? "Compañía", `Hola, te escribo por la solicitud ${r.codigo}: `);

  function cancelar() {
    confirmar("¿Cancelar la solicitud?", `Se quitará de las solicitudes activas de la compañía y quedará en tu historial como cancelada (${r.codigo}).`, "Cancelar solicitud", async () => {
      setOcupado(true);
      const { error: e } = await supabase.rpc("cancelar_reserva", { p_id: r.id });
      setOcupado(false);
      if (e) return setError(mensajeError(e, "No pudimos cancelar. Intenta de nuevo."));
      onCambio();
    });
  }

  if (vista === "compania") {
    return <DetalleCompania r={r} perfil={perfil} futura={futura} logistica={logistica} ocupado={ocupado} error={error} bajarPDF={bajarPDF} onCambio={onCambio} />;
  }

  return (
    <Tarjeta>
      <View style={estilos.cabeza}>
        <Text style={estilos.codigo}>{r.codigo}</Text>
        <Etiqueta texto={est.texto} tono={est.tono} />
        <Texto v="fino" style={{ flex: 1, textAlign: "right" }} numberOfLines={1}>
          {rangoCO(r.entrega, r.recogida)}
        </Texto>
      </View>

      <View style={{ gap: 2 }}>
        <Texto v="etiqueta">Proveedor</Texto>
        <Texto peso={600} style={{ fontSize: 16.5 }}>
          {r.companias?.nombre}
        </Texto>
        <Texto v="fino">Show en {r.lugar_nombre}</Texto>
      </View>

      <View style={{ gap: 3 }}>
        {r.reserva_items.map((i, k) => (
          <Texto key={k}>
            <Texto peso={600} tono={color.acento}>
              {i.cantidad}×
            </Texto>{" "}
            {i.nombre}
          </Texto>
        ))}
        <Texto v="fino">{logistica}</Texto>
      </View>

      <View style={estilos.precio}>
        <View style={{ flex: 1 }}>
          <Texto v="fino">Precio de referencia · {plural(r.dias, "día", "días")}</Texto>
          <Texto v="fino">El valor final lo acuerdas con la compañía</Texto>
        </View>
        <Texto peso={700} style={{ fontSize: 18 }}>
          {pesos(referencia(r))}
        </Texto>
      </View>

      {r.nota ? <Texto style={estilos.nota}>“{r.nota}”</Texto> : null}
      {r.estado === "rechazada" && r.motivo_rechazo ? <Texto style={estilos.nota}>No se concretó: {r.motivo_rechazo}</Texto> : null}
      <Pressable onPress={() => setDetalle(!detalle)} accessibilityRole="button" style={{ paddingVertical: 2 }}>
        <Texto v="fino" peso={600} tono={color.acento}>
          {detalle ? "Ocultar detalle" : "Ver detalle de la cotización"}
        </Texto>
      </Pressable>
      {detalle ? (
        <View style={estilos.detalle}>
          <Fila izq={`Alquiler (${plural(r.dias, "día", "días")})`} der={pesos(r.alquiler)} />
          <Fila izq="Transporte" der={r.modalidad === "retiro" ? "Retiro en bodega" : pesos(r.transporte)} />
          {Number(r.tecnico) > 0 ? <Fila izq="Técnico" der={pesos(r.tecnico)} /> : null}
          <Fila izq="Total de referencia" der={pesos(referencia(r))} fuerte />
          <Texto v="fino">Solicitud enviada el {fechaCO(r.creado)}.</Texto>
        </View>
      ) : null}

      {error ? <Aviso tono="mal" texto={error} /> : null}

      <View style={{ gap: 8 }}>
        <Boton titulo="Cotización PDF" tipo="secundario" bloque deshabilitado={ocupado} onPress={bajarPDF} />
        {["pendiente", "confirmada"].includes(r.estado) ? (
          <Boton titulo="Conversar con proveedor" tipo="primario" bloque icono={<Icono n="chat" tam={18} tinta="#FFFFFF" grosor={2} />} cargando={chat.abriendo} onPress={conversar} />
        ) : null}
        {puedeCalificar ? <Calificar reservaId={r.id} compania={r.companias?.nombre ?? "la compañía"} inicial={resena} onListo={onCambio} /> : null}
        {futura && (r.estado === "pendiente" || r.estado === "confirmada") ? (
          <Boton titulo="Cancelar solicitud" tipo="peligro" bloque deshabilitado={ocupado} onPress={cancelar} />
        ) : null}
        {chat.error ? <Aviso tono="mal" texto={chat.error} /> : null}
      </View>
    </Tarjeta>
  );
}

// La solicitud vista por la compañía (dentro de la ventana que se abre desde el Panel): sin cajas dentro
// de cajas, solo secciones separadas por líneas: cliente, pedido, total y lo que puede hacer.
function DetalleCompania({
  r,
  perfil,
  futura,
  logistica,
  ocupado,
  error,
  bajarPDF,
  onCambio,
}: {
  r: ReservaFila;
  perfil: PerfilCliente | null;
  futura: boolean;
  logistica: string;
  ocupado: boolean;
  error: string;
  bajarPDF: () => void;
  onCambio: () => void;
}) {
  const [detalle, setDetalle] = useState(false);
  const est = ESTADOS_RESERVA[r.estado] ?? { texto: r.estado, tono: "" as const };
  const km = r.distancia_km !== null ? ` · a ${String(Math.round(Number(r.distancia_km) * 10) / 10).replace(".", ",")} km de tu bodega` : "";
  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Etiqueta texto={est.texto} tono={est.tono} />
        <Texto v="fino" style={{ flex: 1 }} numberOfLines={1}>
          Enviada el {fechaCO(r.creado)}
        </Texto>
      </View>

      {perfil ? (
        <TarjetaPerfil p={perfil} />
      ) : (
        <Texto peso={600} style={{ fontSize: 17 }}>
          {r.cliente_nombre || "Cliente"}
        </Texto>
      )}

      <View style={estilos.sep} />

      <View style={{ gap: 6 }}>
        <Texto v="etiqueta">Pedido</Texto>
        {r.reserva_items.map((i, k) => (
          <Texto key={k}>
            <Texto peso={600} tono={color.acento}>
              {i.cantidad}×
            </Texto>{" "}
            {i.nombre}
          </Texto>
        ))}
        <Texto v="fino" style={{ marginTop: 2 }}>
          {r.lugar_nombre}
          {km}
        </Texto>
        <Texto v="fino">{logistica}</Texto>
        {r.nota ? <Texto style={estilos.nota}>“{r.nota}”</Texto> : null}
        {r.estado === "rechazada" && r.motivo_rechazo ? <Texto style={estilos.nota}>No se concretó: {r.motivo_rechazo}</Texto> : null}
      </View>

      <View style={estilos.sep} />

      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Texto peso={600}>Total de referencia</Texto>
            <Texto v="fino">{plural(r.dias, "día", "días")} · sin comisión de ENRENTA</Texto>
          </View>
          <Texto peso={700} style={{ fontSize: 20 }}>
            {pesos(referencia(r))}
          </Texto>
        </View>
        <Pressable onPress={() => setDetalle(!detalle)} accessibilityRole="button" style={{ paddingVertical: 2 }}>
          <Texto v="fino" peso={600} tono={color.acento}>
            {detalle ? "Ocultar desglose" : "Ver desglose"}
          </Texto>
        </Pressable>
        {detalle ? (
          <View style={{ gap: 2 }}>
            <Fila izq={`Alquiler (${plural(r.dias, "día", "días")})`} der={pesos(r.alquiler)} />
            <Fila izq="Transporte" der={r.modalidad === "retiro" ? "Retiro en bodega" : pesos(r.transporte)} />
            {Number(r.tecnico) > 0 ? <Fila izq="Técnico" der={pesos(r.tecnico)} /> : null}
          </View>
        ) : null}
      </View>

      <View style={estilos.sep} />

      {error ? <Aviso tono="mal" texto={error} /> : null}
      <View style={{ gap: 8 }}>
        {r.estado === "pendiente" ? (
          <>
            <Responder id={r.id} onListo={onCambio} />
            <Boton titulo="Descargar cotización en PDF" tipo="enlace" deshabilitado={ocupado} onPress={bajarPDF} />
          </>
        ) : (
          <>
            {!futura && RENTADA.includes(r.estado) ? <CalificarCliente reservaId={r.id} nombre={perfil?.nombre || r.cliente_nombre || ""} onListo={onCambio} /> : null}
            <Boton titulo="Descargar cotización en PDF" tipo="secundario" bloque deshabilitado={ocupado} onPress={bajarPDF} />
          </>
        )}
      </View>
    </View>
  );
}

// El cliente califica a la compañía (de 1 a 5 estrellas y un comentario opcional).
function Calificar({
  reservaId,
  compania,
  inicial,
  onListo,
}: {
  reservaId: string;
  compania: string;
  inicial: MiResena | null;
  onListo: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [estrellas, setEstrellas] = useState(inicial?.estrellas ?? 0);
  const [comentario, setComentario] = useState(inicial?.comentario ?? "");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");

  async function enviar() {
    if (estrellas < 1) return setError("Elige de 1 a 5 estrellas.");
    setOcupado(true);
    setError("");
    const { error: e } = await supabase.rpc("dejar_resena", {
      p_reserva: reservaId,
      p_estrellas: estrellas,
      p_comentario: comentario.trim() || null,
    });
    setOcupado(false);
    if (e) return setError(mensajeError(e, "No pudimos guardar tu reseña. Intenta de nuevo."));
    setAbierto(false);
    onListo();
  }

  if (!abierto) {
    return inicial ? (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Texto v="fino">Tu reseña:</Texto>
        <Estrellas valor={inicial.estrellas} />
        <Boton titulo="Editar" tipo="enlace" onPress={() => setAbierto(true)} />
      </View>
    ) : (
      <Boton titulo={`Calificar a ${compania}`} bloque onPress={() => setAbierto(true)} />
    );
  }

  return (
    <View style={estilos.calificar}>
      <Texto peso={600}>¿Cómo te fue con {compania}?</Texto>
      <View style={{ flexDirection: "row", gap: 6 }} accessibilityRole="radiogroup">
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => setEstrellas(n)} accessibilityRole="radio" accessibilityLabel={`${n} estrellas`} accessibilityState={{ selected: estrellas === n }} hitSlop={4}>
            <Text style={{ fontSize: 34, color: n <= estrellas ? "#F0A52A" : color.lineaFuerte }}>★</Text>
          </Pressable>
        ))}
      </View>
      <Campo etiqueta="Comentario (opcional)" multiline value={comentario} onChangeText={(v) => setComentario(v.slice(0, 600))} placeholder="¿El equipo llegó a tiempo y en buen estado?" />
      {error ? <Aviso tono="mal" texto={error} /> : null}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Boton titulo="Guardar reseña" cargando={ocupado} onPress={enviar} />
        <Boton titulo="Cancelar" tipo="enlace" onPress={() => setAbierto(false)} />
      </View>
    </View>
  );
}

// La compañía marca la solicitud como rentada (aparta el equipo) o como no concretada.
function Responder({ id, onListo }: { id: string; onListo: () => void }) {
  const [noConcreto, setNoConcreto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");

  async function responder(rentada: boolean) {
    setOcupado(true);
    setError("");
    const { error: e } = await supabase.rpc("responder_reserva", {
      p_id: id,
      p_aceptar: rentada,
      p_motivo: rentada ? null : motivo.trim() || null,
    });
    setOcupado(false);
    if (e) return setError(mensajeError(e, "No pudimos guardar. Intenta de nuevo."));
    onListo();
  }

  if (noConcreto) {
    return (
      <View style={{ gap: 10 }}>
        <Campo etiqueta="Motivo (opcional, lo ve el cliente)" value={motivo} onChangeText={setMotivo} placeholder="Ej.: No tenemos disponibilidad ese día" />
        {error ? <Aviso tono="mal" texto={error} /> : null}
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <Boton titulo="Marcar como no concretada" tipo="peligro" cargando={ocupado} onPress={() => responder(false)} />
          <Boton titulo="Volver" tipo="enlace" onPress={() => setNoConcreto(false)} />
        </View>
      </View>
    );
  }
  return (
    <View style={{ gap: 8 }}>
      {error ? <Aviso tono="mal" texto={error} /> : null}
      <Boton titulo="Renta confirmada" bloque cargando={ocupado} onPress={() => responder(true)} />
      <Boton titulo="No se concretó" tipo="secundario" bloque deshabilitado={ocupado} onPress={() => setNoConcreto(true)} />
    </View>
  );
}

const estilos = StyleSheet.create({
  cabeza: { flexDirection: "row", alignItems: "center", gap: 8 },
  codigo: { fontFamily: fuente[700], fontSize: 13, color: color.tinta, letterSpacing: 0.5 },
  precio: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: color.superficie2, borderRadius: radio.md, padding: 12 },
  sep: { height: 1, backgroundColor: color.linea },
  nota: { fontStyle: "italic", color: color.suave, fontSize: 14 },
  detalle: { gap: 2, borderTopWidth: 1, borderTopColor: color.linea, paddingTop: 8 },
  calificar: { gap: 10, backgroundColor: color.acentoSuave, borderRadius: radio.md, padding: 14 },
});
