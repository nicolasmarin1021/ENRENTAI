import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { CamposEntrega, entregaAGuardar, validarEntrega, type DatosEntrega } from "@/componentes/entrega";
import { ConCompania } from "@/componentes/sin-compania";
import { useCatalogo } from "@/lib/catalogo";
import { conPuntos, pesos } from "@/lib/formato";
import { distanciaKm, MEDELLIN, type Punto } from "@/lib/geo";
import { supabase } from "@/lib/supabase";
import { normalizarWhatsApp, whatsappValido } from "@/lib/whatsapp";
import { ZONAS } from "@/lib/zonas";
import { Aviso, Boton, Campo, Cargando, Chip, Encabezado, Pantalla, Tarjeta, Texto } from "@/ui/base";
import { Mapa } from "@/ui/mapa";
import { color } from "@/tema";

type Form = DatosEntrega & { whatsapp: string; direccion: string; horario: string; zona: string; pin: Punto | null };

// La zona más cercana al pin (para mostrar "Belén", "El Poblado"… junto a la compañía).
const zonaCercana = (p: Punto) => ZONAS.reduce((a, z) => (distanciaKm(p, z) < distanciaKm(p, a) ? z : a), ZONAS[0]).id;

// "573001234567" → "300 123 4567" para editarlo cómodo.
const whatsappLocal = (n: string) => {
  const m = n.match(/^57(\d{3})(\d{3})(\d{4})$/);
  return m ? `${m[1]} ${m[2]} ${m[3]}` : n;
};

// Una sección dentro de la tarjeta: título, una línea de ayuda y sus campos; una línea la separa de la anterior.
function Seccion({ titulo, ayuda, linea, children }: { titulo: string; ayuda: string; linea?: boolean; children: ReactNode }) {
  return (
    <View style={[{ padding: 16, gap: 12 }, linea && { borderTopWidth: 1, borderTopColor: color.linea }]}>
      <View style={{ gap: 2 }}>
        <Texto v="subtitulo">{titulo}</Texto>
        <Texto v="fino">{ayuda}</Texto>
      </View>
      {children}
    </View>
  );
}

export default function Tarifas() {
  return <ConCompania titulo="Generalidades">{(cid) => <FormTarifas cid={cid} />}</ConCompania>;
}

// Tarifas de referencia de la compañía: WhatsApp para cotizaciones, transporte, técnico y bodega.
// La ubicación de la bodega (dirección + pin en el mapa) es la misma que ven los clientes en el mapa
// de Buscar equipos y Explorar, y desde donde se calculan la distancia y el transporte.
export function FormTarifas({ cid }: { cid: string }) {
  const { recargar: recargarCatalogo } = useCatalogo();
  const [f, setF] = useState<Form | null>(null);
  const [foco, setFoco] = useState<Punto | null>(null);
  const [error, setError] = useState("");
  const [guardado, setGuardado] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase
        .from("companias")
        .select(
          "cobertura_km, transporte_modo, transporte_fijo, transporte_base, transporte_km, tecnico_nombre, tecnico_tarifa_dia, direccion_bodega, horario_bodega, zona, lat, lng",
        )
        .eq("id", cid)
        .single(),
      supabase.from("companias_privado").select("whatsapp").eq("compania_id", cid).maybeSingle(),
    ]).then(([c, p]) => {
      if (c.error || !c.data) return setError("No pudimos cargar tus datos. Revisa tu conexión.");
      const t = c.data as {
        cobertura_km: number; transporte_modo: "fijo" | "variable"; transporte_fijo: number; transporte_base: number; transporte_km: number;
        tecnico_nombre: string | null; tecnico_tarifa_dia: number | null; direccion_bodega: string | null; horario_bodega: string | null;
        zona: string | null; lat: number | null; lng: number | null;
      };
      const pin = t.lat !== null && t.lng !== null ? { lat: Number(t.lat), lng: Number(t.lng) } : null;
      setF({
        whatsapp: whatsappLocal((p.data as { whatsapp: string | null } | null)?.whatsapp ?? ""),
        cobertura: String(t.cobertura_km),
        modo: t.transporte_modo,
        fijo: conPuntos(Math.round(Number(t.transporte_fijo))),
        base: conPuntos(Math.round(Number(t.transporte_base))),
        km: conPuntos(Math.round(Number(t.transporte_km))),
        tecnico: t.tecnico_nombre ?? "",
        tarifaTecnico: t.tecnico_tarifa_dia ? conPuntos(Math.round(Number(t.tecnico_tarifa_dia))) : "",
        direccion: t.direccion_bodega ?? "",
        horario: t.horario_bodega ?? "",
        zona: ZONAS.find((z) => z.nombre === t.zona)?.id ?? (pin ? zonaCercana(pin) : ""),
        pin,
      });
    });
  }, [cid]);

  if (!f) {
    return (
      <Pantalla>
        <Encabezado titulo="Generalidades" />
        {error ? <Aviso tono="mal" texto={error} /> : <Cargando texto="Cargando tus datos…" />}
      </Pantalla>
    );
  }

  const cambiar = (c: Partial<Form>) => {
    setF((p) => (p ? { ...p, ...c } : p));
    setGuardado(false);
    setError("");
  };

  async function guardar() {
    if (!f) return;
    const numero = normalizarWhatsApp(f.whatsapp);
    const problema = !whatsappValido(numero)
      ? "Escribe el WhatsApp para cotizaciones (un celular de 10 dígitos, p. ej. 300 123 4567)."
      : f.direccion.trim().length < 6
        ? "Escribe la dirección de la bodega."
        : !f.pin || !f.zona
          ? "Ubica tu bodega en el mapa: toca el punto exacto donde queda."
          : validarEntrega(f);
    if (problema || !f.pin) return setError(problema || "Ubica tu bodega en el mapa.");
    const zona = ZONAS.find((z) => z.id === f.zona)!;
    setOcupado(true);
    // .select() confirma que de verdad se actualizó la fila (las reglas de acceso no dan error si no la encuentran).
    const [t, c] = await Promise.all([
      supabase
        .from("companias")
        .update({
          ...entregaAGuardar(f),
          direccion_bodega: f.direccion.trim(),
          horario_bodega: f.horario.trim() || null,
          // El mismo punto que aparece en el mapa de los clientes.
          zona: zona.nombre,
          lat: f.pin.lat,
          lng: f.pin.lng,
        })
        .eq("id", cid)
        .select("id"),
      supabase.from("companias_privado").update({ whatsapp: numero }).eq("compania_id", cid).select("compania_id"),
    ]);
    setOcupado(false);
    if (t.error || !t.data?.length || c.error || !c.data?.length) return setError("No pudimos guardar tus cambios. Revisa tu conexión e intenta de nuevo.");
    setGuardado(true);
    // El mapa de Buscar equipos y Explorar se actualiza con la nueva ubicación.
    void recargarCatalogo();
  }

  const tecnico = Number(f.tarifaTecnico.replace(/\D/g, "") || 0);

  return (
    <Pantalla>
      <Encabezado titulo="Generalidades" sub="Lo básico de tu compañía: cómo te contactan, dónde estás y cómo entregas." />
      {/* Una sola tarjeta con tres secciones separadas por líneas, para no perderse entre cajas. */}
      <Tarjeta style={{ gap: 0, padding: 0 }}>
        <Seccion titulo="Contacto" ayuda="Aquí te escriben los clientes que piden cotización.">
          <Campo etiqueta="WhatsApp" keyboardType="phone-pad" placeholder="300 123 4567" value={f.whatsapp} onChangeText={(v) => cambiar({ whatsapp: v })} autoComplete="tel" />
        </Seccion>
        <Seccion titulo="Bodega" ayuda="Es el punto que ven los clientes en el mapa; desde aquí se calcula la distancia." linea>
          <Campo etiqueta="Dirección" placeholder="Cra. 43A # 1-50" value={f.direccion} onChangeText={(v) => cambiar({ direccion: v })} />
          <Texto peso={500} style={{ fontSize: 14 }}>
            Zona
          </Texto>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
            {ZONAS.map((z) => (
              <Chip
                key={z.id}
                texto={z.nombre}
                activo={f.zona === z.id}
                onPress={() => {
                  // Lleva el mapa a esa zona; si el pin está lejos, lo pone en su centro para que lo ajustes.
                  const centro = { lat: z.lat, lng: z.lng };
                  const lejos = !f.pin || distanciaKm(f.pin, centro) > 3;
                  cambiar({ zona: z.id, pin: lejos ? centro : f.pin });
                  setFoco(lejos ? centro : f.pin);
                }}
              />
            ))}
          </ScrollView>
          <Mapa
            centro={f.pin ?? MEDELLIN}
            delta={f.pin ? 0.03 : 0.18}
            pin={f.pin}
            foco={foco}
            onPin={(p) => cambiar({ pin: p, zona: zonaCercana(p) })}
            style={{ height: 220, borderRadius: 14 }}
          />
          <Texto v="fino">{f.pin ? "Arrastra el pin hasta la entrada de tu bodega." : "Elige la zona y toca el punto exacto de tu bodega."}</Texto>
          <Campo etiqueta="Horario (opcional)" placeholder="Lun a sáb, 8 a. m. – 6 p. m." value={f.horario} onChangeText={(v) => cambiar({ horario: v })} />
        </Seccion>
        <Seccion titulo="Entregas y técnico" ayuda="El cliente ve estos valores al armar su rider; el valor final lo acuerdan contigo." linea>
          <CamposEntrega f={f} cambiar={cambiar} />
          {f.tecnico.trim() && tecnico > 0 ? <Texto v="fino">El cliente verá «{f.tecnico.trim()}: {pesos(tecnico)} por día».</Texto> : null}
        </Seccion>
      </Tarjeta>
      {error ? <Aviso tono="mal" texto={error} /> : null}
      {guardado ? <Aviso tono="ok" texto="Listo: tus cambios quedaron guardados." /> : null}
      <Boton titulo="Guardar cambios" bloque cargando={ocupado} onPress={guardar} />
    </Pantalla>
  );
}
