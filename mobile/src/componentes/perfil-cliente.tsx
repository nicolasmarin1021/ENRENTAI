import { Image } from "expo-image";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { promedioTexto, textoProblema } from "@/lib/calificaciones";
import { iniciales, plural } from "@/lib/formato";
import { enlaceAbrible, enlaceCorto, urlAvatar, type PerfilCliente } from "@/lib/perfil";
import { Etiqueta, Texto } from "@/ui/base";
import { Estrellas, Icono } from "@/ui/iconos";
import { color, fuente, radio } from "@/tema";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const desde = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${MESES[d.getMonth()]} ${d.getFullYear()}`;
};

// La foto de perfil, o las iniciales si no tiene.
export function Avatar({ nombre, foto, tam = 56 }: { nombre: string; foto: string | null; tam?: number }) {
  return (
    <View style={[estilos.avatar, { width: tam, height: tam, borderRadius: tam / 2 }]}>
      {foto ? (
        <Image source={{ uri: urlAvatar(foto) }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      ) : (
        <Text style={[estilos.iniciales, { fontSize: tam * 0.34 }]}>{iniciales(nombre || "?")}</Text>
      )}
    </View>
  );
}

// Lo que una compañía ve de quien le pide equipo.
export function TarjetaPerfil({ p }: { p: PerfilCliente }) {
  const linea = [p.ocupacion, p.empresa].filter(Boolean).join(" · ");
  const vacio = !p.ocupacion && !p.empresa && !p.descripcion && !p.foto;
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <Avatar nombre={p.nombre} foto={p.foto} />
        <View style={{ flex: 1, gap: 2 }}>
          <Texto peso={600} style={{ fontSize: 17 }} numberOfLines={1}>
            {p.nombre || "Cliente"}
          </Texto>
          {linea ? (
            <Texto style={{ fontSize: 14.5 }} numberOfLines={2}>
              {linea}
            </Texto>
          ) : null}
          <Texto v="fino" numberOfLines={1}>
            {p.ciudad}
            {p.miembro_desde ? ` · en ENRENTA desde ${desde(p.miembro_desde)}` : ""}
          </Texto>
        </View>
      </View>

      {p.descripcion ? <Texto style={estilos.descripcion}>{p.descripcion}</Texto> : null}

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {typeof p.rentas === "number" ? (
          <View style={estilos.dato}>
            <Icono n="check" tam={14} tinta={color.ok} grosor={2.4} />
            <Texto v="fino" tono={color.tinta} peso={500}>
              {p.rentas ? `${plural(p.rentas, "renta", "rentas")} en ENRENTA` : "Primera renta en ENRENTA"}
            </Texto>
          </View>
        ) : null}
        {p.enlace ? (
          <Pressable onPress={() => Linking.openURL(enlaceAbrible(p.enlace!)).catch(() => {})} style={estilos.dato} accessibilityRole="link">
            <Icono n="enlace" tam={14} tinta={color.acento} />
            <Texto v="fino" tono={color.acento} peso={500} numberOfLines={1}>
              {enlaceCorto(p.enlace)}
            </Texto>
          </Pressable>
        ) : null}
      </View>

      {vacio ? <Texto v="fino">Este cliente aún no completó su perfil.</Texto> : null}

      {p.calificacion !== undefined ? <CalificacionesDeCompanias p={p} /> : null}
    </View>
  );
}

// Lo que dicen de este cliente las compañías a las que les ha rentado (SQL 0011).
function CalificacionesDeCompanias({ p }: { p: PerfilCliente }) {
  const r = p.calificacion;
  const lista = p.calificaciones ?? [];
  if (!r || !r.total) {
    return (
      <View style={estilos.calif}>
        <Texto v="fino">Todavía ninguna compañía ha calificado a este cliente.</Texto>
      </View>
    );
  }
  return (
    <View style={estilos.calif}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <Texto peso={700} style={{ fontSize: 17 }}>
          ★ {promedioTexto(r.promedio)}
        </Texto>
        <Texto v="fino" tono={color.tinta}>
          {plural(r.total, "calificación", "calificaciones")} de compañías
        </Texto>
        {r.problemas > 0 ? <Etiqueta texto={`⚠ ${plural(r.problemas, "reporte", "reportes")}`} tono="mal" /> : null}
      </View>
      {lista.map((c, i) => (
        <View key={i} style={[estilos.califFila, i > 0 && { borderTopWidth: 1, borderTopColor: color.linea }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Texto v="fino" peso={600} tono={color.tinta} numberOfLines={1} style={{ flexShrink: 1 }}>
              {c.compania || "Una compañía"}
            </Texto>
            <Estrellas valor={c.estrellas} tam={11} />
            <View style={{ flex: 1 }} />
            <Texto v="fino">{desde(c.creado)}</Texto>
          </View>
          {c.problema ? (
            <View style={{ flexDirection: "row" }}>
              <Etiqueta texto={`⚠ ${textoProblema(c.problema)}`} tono="mal" />
            </View>
          ) : null}
          {c.comentario ? <Texto style={{ fontSize: 14.5 }}>{c.comentario}</Texto> : null}
          {c.respuesta ? (
            <Texto v="fino">
              <Texto v="fino" peso={600} tono={color.tinta}>
                Respuesta del cliente:{" "}
              </Texto>
              {c.respuesta}
            </Texto>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  avatar: { backgroundColor: color.acentoSuave, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  iniciales: { fontFamily: fuente[700], color: color.acento },
  descripcion: { fontSize: 15, lineHeight: 22, backgroundColor: color.superficie2, borderRadius: radio.md, padding: 12 },
  calif: { gap: 10, borderWidth: 1, borderColor: color.linea, borderRadius: radio.md, padding: 12 },
  califFila: { gap: 6, paddingTop: 10 },
  dato: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radio.pildora,
    backgroundColor: color.superficie2,
    maxWidth: "100%",
  },
});
