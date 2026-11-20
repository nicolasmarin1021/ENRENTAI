import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { AgendaStock, ListaBloqueos, SalidasRegresos } from "@/componentes/agenda-stock";
import { ConCompania } from "@/componentes/sin-compania";
import { hoyCO, ocupacionDia } from "@/lib/agenda";
import { norm } from "@/lib/busqueda";
import { NOMBRE_CORTO, urlFoto, useCatalogo } from "@/lib/catalogo";
import { movimientos, useDatosCompania, type DatosCompania, type EquipoInventario } from "@/lib/datos-compania";
import { pesos, plural } from "@/lib/formato";
import { Aviso, Cargando, Encabezado, Etiqueta, Pantalla, Segmentos, Tarjeta, Texto } from "@/ui/base";
import { Icono, IconoCategoria } from "@/ui/iconos";
import { color, fuente, radio } from "@/tema";

export default function Inventario() {
  return <ConCompania titulo="Inventario">{(cid) => <InventarioCompania cid={cid} />}</ConCompania>;
}

const nuevo = () => router.push({ pathname: "/equipo-editar/[id]", params: { id: "nuevo" } });

// Inventario de la compañía, pensado para mucho stock: buscador, filtro por tipo, lista compacta
// agrupada por tipo (con lo libre hoy) y la disponibilidad por días con bloqueos (como la web).
function InventarioCompania({ cid }: { cid: string }) {
  const datos = useDatosCompania(cid);
  return <InventarioVista {...datos} />;
}

// Solo dibuja (los datos los trae InventarioCompania).
export function InventarioVista({
  equipos,
  reservas,
  bloqueos,
  cargando,
  error,
  recargar,
}: Pick<DatosCompania, "equipos" | "reservas" | "bloqueos"> & { cargando: boolean; error: string; recargar: () => void | Promise<void> }) {
  const { catalogo } = useCatalogo();
  const [vista, setVista] = useState<"equipos" | "disponibilidad">("equipos");
  const [buscar, setBuscar] = useState("");
  const [cat, setCat] = useState<string | null>(null);

  const nombreCat = (id: string) => NOMBRE_CORTO[id] ?? catalogo.categorias.find((c) => c.id === id)?.nombre ?? id;
  const orden = catalogo.categorias.map((c) => c.id);
  const tipos = [...new Set(equipos.map((e) => e.categoria_id))].sort((a, b) => orden.indexOf(a) - orden.indexOf(b));
  const filtrados = equipos.filter((e) => (!cat || e.categoria_id === cat) && (!buscar.trim() || norm(e.nombre).includes(norm(buscar.trim()))));
  const unidades = equipos.reduce((a, e) => a + e.unidades, 0);

  // Lo libre hoy de cada equipo (rentadas y bloqueos de hoy).
  const movs = movimientos(reservas, bloqueos);
  const hoy = hoyCO();
  const libresHoy = (e: EquipoInventario) => {
    const o = ocupacionDia(movs, e.id, hoy);
    return e.unidades - Math.min(e.unidades, o.usadas + o.bloqueadas);
  };

  return (
    <Pantalla refrescando={cargando && equipos.length > 0} onRefrescar={recargar}>
      <Encabezado
        titulo="Inventario"
        sub={equipos.length ? `${plural(equipos.length, "equipo", "equipos")} · ${plural(unidades, "unidad", "unidades")}` : undefined}
        derecha={
          <Pressable onPress={nuevo} style={estilos.agregar} accessibilityRole="button" accessibilityLabel="Agregar equipo">
            <Icono n="mas" tam={22} tinta="#FFFFFF" grosor={2.4} />
          </Pressable>
        }
      />

      {error ? <Aviso tono="mal" texto={error} /> : null}

      {cargando && !equipos.length ? (
        <Cargando texto="Cargando tu inventario…" />
      ) : !equipos.length ? (
        <Tarjeta style={{ alignItems: "center", paddingVertical: 28, gap: 12 }}>
          <View style={estilos.vacio}>
            <Icono n="bodega" tam={30} tinta={color.acento} />
          </View>
          <Texto v="subtitulo">Publica tu primer equipo</Texto>
          <Texto v="fino" style={{ textAlign: "center" }}>
            Marca y modelo, cuántas unidades tienes, el precio por 24 horas y fotos reales: con fotos se rentan mucho más.
          </Texto>
          <Pressable onPress={nuevo} style={[estilos.agregar, { width: "auto", paddingHorizontal: 20, flexDirection: "row", gap: 8 }]}>
            <Icono n="mas" tam={18} tinta="#FFFFFF" grosor={2.4} />
            <Texto peso={600} tono="#FFFFFF">
              Agregar equipo
            </Texto>
          </Pressable>
        </Tarjeta>
      ) : (
        <>
          <Segmentos
            opciones={[
              { id: "equipos", texto: "Equipos" },
              { id: "disponibilidad", texto: "Disponibilidad" },
            ]}
            valor={vista}
            onCambio={setVista}
          />

          {/* Buscador y tipos (sirven para las dos vistas). */}
          <View style={estilos.buscador}>
            <Icono n="buscar" tam={18} tinta={color.suave} />
            <TextInput
              value={buscar}
              onChangeText={setBuscar}
              placeholder="Buscar en tu inventario"
              placeholderTextColor="#9AA0AE"
              autoCorrect={false}
              style={estilos.buscadorInput}
              accessibilityLabel="Buscar en tu inventario"
            />
            {buscar ? (
              <Pressable onPress={() => setBuscar("")} hitSlop={8} accessibilityRole="button" accessibilityLabel="Borrar búsqueda">
                <Icono n="cerrar" tam={16} tinta={color.suave} />
              </Pressable>
            ) : null}
          </View>
          {tipos.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginHorizontal: -16 }}>
              <View style={{ width: 8 }} />
              <ChipTipo texto={`Todo · ${equipos.length}`} activo={!cat} onPress={() => setCat(null)} />
              {tipos.map((t) => (
                <ChipTipo
                  key={t}
                  texto={`${nombreCat(t)} · ${equipos.filter((e) => e.categoria_id === t).length}`}
                  icono={t}
                  activo={cat === t}
                  onPress={() => setCat(cat === t ? null : t)}
                />
              ))}
              <View style={{ width: 8 }} />
            </ScrollView>
          ) : null}

          {!filtrados.length ? (
            <Texto v="fino" style={{ textAlign: "center", paddingVertical: 16 }}>
              Nada coincide con la búsqueda.
            </Texto>
          ) : vista === "equipos" ? (
            // Lista compacta, agrupada por tipo de equipo.
            tipos
              .filter((t) => filtrados.some((e) => e.categoria_id === t))
              .map((t) => {
                const grupo = filtrados.filter((e) => e.categoria_id === t);
                return (
                  <View key={t} style={{ gap: 8 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <IconoCategoria cat={t} tam={18} />
                      <Texto peso={600} style={{ fontSize: 15, flex: 1 }}>
                        {nombreCat(t)}
                      </Texto>
                      <Texto v="fino">
                        {plural(grupo.reduce((a, e) => a + e.unidades, 0), "unidad", "unidades")}
                      </Texto>
                    </View>
                    <View style={estilos.grupo}>
                      {grupo.map((e, i) => (
                        <FilaInventario key={e.id} e={e} libres={libresHoy(e)} primera={i === 0} />
                      ))}
                    </View>
                  </View>
                );
              })
          ) : (
            <>
              <AgendaStock equipos={filtrados} reservas={reservas} bloqueos={bloqueos} onCambio={recargar} />
              <ListaBloqueos bloqueos={bloqueos} equipos={equipos} onCambio={recargar} />
              <SalidasRegresos reservas={reservas} />
            </>
          )}
        </>
      )}
    </Pantalla>
  );
}

function ChipTipo({ texto, icono, activo, onPress }: { texto: string; icono?: string; activo: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[estilos.chip, activo && estilos.chipActivo]} accessibilityRole="button" accessibilityState={{ selected: activo }}>
      {icono ? <IconoCategoria cat={icono} tam={15} tinta={activo ? "#FFFFFF" : color.tinta} /> : null}
      <Texto peso={500} style={{ fontSize: 13.5 }} tono={activo ? "#FFFFFF" : color.tinta}>
        {texto}
      </Texto>
    </Pressable>
  );
}

// Una fila del inventario: foto, nombre, unidades, precio y lo libre hoy.
function FilaInventario({ e, libres, primera }: { e: EquipoInventario; libres: number; primera: boolean }) {
  const portada = [...e.equipo_fotos].sort((a, b) => a.orden - b.orden)[0];
  const tono = libres === e.unidades ? color.ok : libres > 0 ? color.aviso : color.mal;
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/equipo-editar/[id]", params: { id: e.id } })}
      accessibilityRole="button"
      accessibilityLabel={`Editar ${e.nombre}`}
      style={({ pressed }) => [estilos.fila, !primera && estilos.linea, pressed && { backgroundColor: color.superficie2 }]}
    >
      <View style={estilos.foto}>
        {portada ? (
          <Image source={{ uri: urlFoto(portada.ruta) }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <IconoCategoria cat={e.categoria_id} tam={20} tinta={color.suave} />
        )}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Texto peso={600} numberOfLines={1}>
          {e.nombre}
        </Texto>
        <Texto v="fino" numberOfLines={1}>
          {e.unidades} u · {pesos(e.precio_dia)} / 24 h{e.banda_nombre ? ` · ${e.banda_nombre}` : ""}
        </Texto>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <View style={[estilos.puntoEstado, { backgroundColor: tono }]} />
          <Texto v="fino" tono={tono} peso={500}>
            {libres === e.unidades ? `${libres} libres hoy` : `${libres} de ${e.unidades} libres hoy`}
          </Texto>
          {!e.activo ? <Etiqueta texto="En pausa" tono="aviso" /> : null}
          {!e.equipo_fotos.length ? <Etiqueta texto="Sin fotos" /> : null}
        </View>
      </View>
      <Icono n="flecha" tam={16} tinta={color.suave} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  agregar: { width: 44, height: 44, borderRadius: 22, backgroundColor: color.acento, alignItems: "center", justifyContent: "center" },
  vacio: { width: 64, height: 64, borderRadius: 32, backgroundColor: color.acentoSuave, alignItems: "center", justifyContent: "center" },
  buscador: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 23,
    backgroundColor: color.superficie,
    borderWidth: 1,
    borderColor: color.linea,
  },
  buscadorInput: { flex: 1, height: "100%", fontFamily: fuente[400], fontSize: 15.5, color: color.tinta, outlineWidth: 0 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radio.pildora,
    backgroundColor: color.superficie,
    borderWidth: 1,
    borderColor: color.linea,
  },
  chipActivo: { backgroundColor: color.tinta, borderColor: color.tinta },
  grupo: { backgroundColor: color.superficie, borderRadius: radio.lg, borderWidth: 1, borderColor: color.linea, overflow: "hidden" },
  fila: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 10 },
  linea: { borderTopWidth: 1, borderTopColor: color.linea },
  foto: {
    width: 48,
    height: 48,
    borderRadius: radio.sm,
    backgroundColor: color.superficie2,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  puntoEstado: { width: 7, height: 7, borderRadius: 4 },
});
