import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { calificacionesRecibidas, miCalificacionDe, promedioTexto, PROBLEMAS, textoProblema, type Calificacion, type Problema } from "@/lib/calificaciones";
import { fechaCO, plural } from "@/lib/formato";
import { mensajeError, supabase } from "@/lib/supabase";
import { Aviso, Boton, Campo, Chip, Etiqueta, Segmentos, Tarjeta, Texto } from "@/ui/base";
import { Estrellas } from "@/ui/iconos";
import { color, radio } from "@/tema";

// La compañía califica a quien le rentó (después de la entrega) y, si algo pasó con el equipo,
// deja un reporte con el motivo. Lo ven el cliente (que puede responder) y las compañías a las
// que ese cliente les pida equipo.
export function CalificarCliente({ reservaId, nombre, onListo }: { reservaId: string; nombre: string; onListo: () => void }) {
  const [inicial, setInicial] = useState<Calificacion | null | undefined>(undefined); // undefined = cargando
  const [abierto, setAbierto] = useState(false);
  const [estrellas, setEstrellas] = useState(0);
  const [hubo, setHubo] = useState<"bien" | "problema">("bien");
  const [problema, setProblema] = useState<Problema | null>(null);
  const [comentario, setComentario] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  const corto = nombre.split(" ")[0] || "el cliente";

  useEffect(() => {
    let vivo = true;
    void miCalificacionDe(reservaId).then((c) => {
      if (vivo) setInicial(c);
    });
    return () => {
      vivo = false;
    };
  }, [reservaId]);

  function abrir(conProblema: boolean) {
    setEstrellas(inicial?.estrellas ?? 0);
    setComentario(inicial?.comentario ?? "");
    setProblema(inicial?.problema ?? null);
    setHubo(conProblema || inicial?.problema ? "problema" : "bien");
    setError("");
    setAbierto(true);
  }

  async function guardar() {
    if (estrellas < 1) return setError("Elige de 1 a 5 estrellas.");
    if (hubo === "problema" && !problema) return setError("Elige qué pasó con el equipo.");
    if (hubo === "problema" && comentario.trim().length < 5) return setError("Cuenta qué pasó con el equipo.");
    setOcupado(true);
    setError("");
    const { error: e } = await supabase.rpc("calificar_cliente", {
      p_reserva: reservaId,
      p_estrellas: estrellas,
      p_comentario: comentario.trim() || null,
      p_problema: hubo === "problema" ? problema : null,
    });
    setOcupado(false);
    if (e) {
      return setError(
        e.code === "PGRST202" ? "Falta ejecutar el SQL 0011_calificar_clientes.sql en Supabase." : mensajeError(e, "No pudimos guardar. Intenta de nuevo."),
      );
    }
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setAbierto(false);
    onListo();
  }

  if (inicial === undefined) return null;

  if (!abierto) {
    return inicial ? (
      <View style={estilos.hecha}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Texto v="fino">Tu calificación:</Texto>
          <Estrellas valor={inicial.estrellas} />
          {inicial.problema ? <Etiqueta texto={`⚠ ${textoProblema(inicial.problema)}`} tono="mal" /> : null}
          <Boton titulo="Editar" tipo="enlace" onPress={() => abrir(false)} />
        </View>
        {inicial.respuesta ? (
          <Texto v="fino">
            <Texto v="fino" peso={600} tono={color.tinta}>
              Respuesta de {corto}:{" "}
            </Texto>
            {inicial.respuesta}
          </Texto>
        ) : null}
      </View>
    ) : (
      <View style={{ gap: 6 }}>
        <Boton titulo={`Calificar a ${corto}`} bloque onPress={() => abrir(false)} />
        <Boton titulo="Reportar un problema con el equipo" tipo="enlace" onPress={() => abrir(true)} style={{ alignSelf: "center" }} />
      </View>
    );
  }

  return (
    <View style={estilos.formulario}>
      <Texto peso={600}>¿Cómo te fue con {corto}?</Texto>
      <View style={{ flexDirection: "row", gap: 6 }} accessibilityRole="radiogroup">
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => setEstrellas(n)} accessibilityRole="radio" accessibilityLabel={`${n} estrellas`} accessibilityState={{ selected: estrellas === n }} hitSlop={4}>
            <Text style={{ fontSize: 34, color: n <= estrellas ? "#F0A52A" : color.lineaFuerte }}>★</Text>
          </Pressable>
        ))}
      </View>
      <Segmentos
        opciones={[
          { id: "bien", texto: "Todo bien" },
          { id: "problema", texto: "Algo pasó" },
        ]}
        valor={hubo}
        onCambio={(v) => {
          setHubo(v);
          setError("");
        }}
      />
      {hubo === "problema" ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {PROBLEMAS.map((p) => (
            <Chip key={p.id} texto={p.texto} activo={problema === p.id} onPress={() => setProblema(p.id)} />
          ))}
        </View>
      ) : null}
      <Campo
        etiqueta={hubo === "problema" ? "Cuenta qué pasó" : "Comentario (opcional)"}
        placeholder={hubo === "problema" ? "Ej.: Devolvió un micrófono con la cápsula golpeada." : "Ej.: Puntual y cuidadoso con el equipo."}
        multiline
        value={comentario}
        onChangeText={(v) => setComentario(v.slice(0, 1000))}
      />
      <Texto v="fino">
        Lo verá {corto} (puede responder) y las compañías a las que le pida equipo en ENRENTA.
      </Texto>
      {error ? <Aviso tono="mal" texto={error} /> : null}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Boton titulo="Guardar" cargando={ocupado} onPress={guardar} />
        <Boton titulo="Cancelar" tipo="enlace" onPress={() => setAbierto(false)} style={{ alignSelf: "center" }} />
      </View>
    </View>
  );
}

// Lo que las compañías dijeron de mí (en mi perfil de cliente), con mi respuesta a cada una.
export function MisCalificaciones({ uid }: { uid: string }) {
  const [estado, setEstado] = useState<{ lista: Calificacion[]; faltaSql: boolean } | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let vivo = true;
    void calificacionesRecibidas(uid).then((r) => {
      if (vivo) setEstado(r);
    });
    return () => {
      vivo = false;
    };
  }, [uid, version]);

  if (!estado || estado.faltaSql) return null;
  const { lista } = estado;
  const promedio = lista.length ? lista.reduce((a, c) => a + c.estrellas, 0) / lista.length : null;
  const problemas = lista.filter((c) => c.problema).length;

  return (
    <View style={{ gap: 8 }}>
      <Texto v="etiqueta">Lo que dicen las compañías</Texto>
      <Tarjeta>
        {lista.length ? (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Texto peso={700} style={{ fontSize: 20 }}>
                ★ {promedioTexto(promedio)}
              </Texto>
              <Texto v="fino" tono={color.tinta}>
                {plural(lista.length, "calificación", "calificaciones")}
              </Texto>
              {problemas ? <Etiqueta texto={`⚠ ${plural(problemas, "reporte", "reportes")}`} tono="mal" /> : null}
            </View>
            <Texto v="fino">
              Las ven las compañías a las que les pidas equipo. Si algo no fue así, responde con tu versión: también la verán.
            </Texto>
            {lista.map((c, i) => (
              <FilaMiCalificacion key={c.id ?? i} c={c} primera={i === 0} onListo={() => setVersion((v) => v + 1)} />
            ))}
          </>
        ) : (
          <Texto v="fino">
            Cuando rentes con una compañía, podrá calificarte. Tus calificaciones solo las ven las compañías a las que les pidas equipo.
          </Texto>
        )}
      </Tarjeta>
    </View>
  );
}

function FilaMiCalificacion({ c, primera, onListo }: { c: Calificacion; primera: boolean; onListo: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState(c.respuesta ?? "");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");

  async function guardar() {
    if (!c.id) return;
    setOcupado(true);
    setError("");
    const { error: e } = await supabase.rpc("responder_calificacion", { p_id: c.id, p_texto: texto.trim() || null });
    setOcupado(false);
    if (e) return setError(mensajeError(e, "No pudimos guardar tu respuesta. Intenta de nuevo."));
    setAbierto(false);
    onListo();
  }

  return (
    <View style={[{ gap: 6, paddingTop: 12 }, !primera && { borderTopWidth: 1, borderTopColor: color.linea }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Texto peso={600} numberOfLines={1} style={{ flexShrink: 1, fontSize: 15 }}>
          {c.compania_nombre || "Una compañía"}
        </Texto>
        <Estrellas valor={c.estrellas} tam={12} />
        <View style={{ flex: 1 }} />
        <Texto v="fino">{fechaCO(c.creado).split(" · ")[0]}</Texto>
      </View>
      {c.problema ? (
        <View style={{ flexDirection: "row" }}>
          <Etiqueta texto={`⚠ ${textoProblema(c.problema)}`} tono="mal" />
        </View>
      ) : null}
      {c.comentario ? <Texto style={{ fontSize: 14.5 }}>{c.comentario}</Texto> : null}
      {abierto ? (
        <View style={{ gap: 8 }}>
          <Campo
            etiqueta="Tu respuesta (la ven las compañías)"
            multiline
            value={texto}
            onChangeText={(v) => setTexto(v.slice(0, 1000))}
            placeholder="Cuenta tu versión con respeto."
          />
          {error ? <Aviso tono="mal" texto={error} /> : null}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Boton titulo="Guardar" chico cargando={ocupado} onPress={guardar} />
            <Boton titulo="Cancelar" tipo="enlace" onPress={() => setAbierto(false)} style={{ alignSelf: "center" }} />
          </View>
        </View>
      ) : c.respuesta ? (
        <Pressable onPress={() => setAbierto(true)} style={estilos.respuesta} accessibilityRole="button" accessibilityLabel="Editar tu respuesta">
          <Texto v="fino" peso={600} tono={color.tinta}>
            Tu respuesta
          </Texto>
          <Texto v="fino">{c.respuesta}</Texto>
        </Pressable>
      ) : (
        <View style={{ flexDirection: "row" }}>
          <Boton titulo="Responder" tipo="suave" chico onPress={() => setAbierto(true)} />
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  hecha: { gap: 6, backgroundColor: color.superficie2, borderRadius: radio.md, padding: 12 },
  formulario: { gap: 12, backgroundColor: color.acentoSuave, borderRadius: radio.md, padding: 14 },
  respuesta: { backgroundColor: color.superficie2, borderRadius: radio.sm, padding: 10, gap: 2 },
});
