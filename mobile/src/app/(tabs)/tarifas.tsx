import { useEffect, useState } from "react";
import { CamposEntrega, entregaAGuardar, validarEntrega, type DatosEntrega } from "@/componentes/entrega";
import { ConCompania } from "@/componentes/sin-compania";
import { conPuntos, pesos } from "@/lib/formato";
import { supabase } from "@/lib/supabase";
import { normalizarWhatsApp, whatsappValido } from "@/lib/whatsapp";
import { Aviso, Boton, Campo, Cargando, Encabezado, Pantalla, Tarjeta, Texto } from "@/ui/base";

type Form = DatosEntrega & { whatsapp: string; direccion: string; horario: string };

// "573001234567" → "300 123 4567" para editarlo cómodo.
const whatsappLocal = (n: string) => {
  const m = n.match(/^57(\d{3})(\d{3})(\d{4})$/);
  return m ? `${m[1]} ${m[2]} ${m[3]}` : n;
};

export default function Tarifas() {
  return <ConCompania titulo="Tarifas">{(cid) => <FormTarifas cid={cid} />}</ConCompania>;
}

// Tarifas de referencia de la compañía: WhatsApp para cotizaciones, transporte, técnico y bodega.
function FormTarifas({ cid }: { cid: string }) {
  const [f, setF] = useState<Form | null>(null);
  const [error, setError] = useState("");
  const [guardado, setGuardado] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase
        .from("companias")
        .select("cobertura_km, transporte_modo, transporte_fijo, transporte_base, transporte_km, tecnico_nombre, tecnico_tarifa_dia, direccion_bodega, horario_bodega")
        .eq("id", cid)
        .single(),
      supabase.from("companias_privado").select("whatsapp").eq("compania_id", cid).maybeSingle(),
    ]).then(([c, p]) => {
      if (c.error || !c.data) return setError("No pudimos cargar tus tarifas. Revisa tu conexión.");
      const t = c.data as {
        cobertura_km: number; transporte_modo: "fijo" | "variable"; transporte_fijo: number; transporte_base: number; transporte_km: number;
        tecnico_nombre: string | null; tecnico_tarifa_dia: number | null; direccion_bodega: string | null; horario_bodega: string | null;
      };
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
      });
    });
  }, [cid]);

  if (!f) {
    return (
      <Pantalla>
        <Encabezado titulo="Tarifas" />
        {error ? <Aviso tono="mal" texto={error} /> : <Cargando texto="Cargando tus tarifas…" />}
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
        : validarEntrega(f);
    if (problema) return setError(problema);
    setOcupado(true);
    // .select() confirma que de verdad se actualizó la fila (las reglas de acceso no dan error si no la encuentran).
    const [t, c] = await Promise.all([
      supabase
        .from("companias")
        .update({ ...entregaAGuardar(f), direccion_bodega: f.direccion.trim(), horario_bodega: f.horario.trim() || null })
        .eq("id", cid)
        .select("id"),
      supabase.from("companias_privado").update({ whatsapp: numero }).eq("compania_id", cid).select("compania_id"),
    ]);
    setOcupado(false);
    if (t.error || !t.data?.length || c.error || !c.data?.length) return setError("No pudimos guardar tus tarifas. Revisa tu conexión e intenta de nuevo.");
    setGuardado(true);
  }

  const tecnico = Number(f.tarifaTecnico.replace(/\D/g, "") || 0);

  return (
    <Pantalla>
      <Encabezado titulo="Tarifas" sub="Tus precios de referencia: el cliente los ve al armar su rider y el valor final lo acuerdan por WhatsApp." />
      <Tarjeta>
        <Texto v="subtitulo">WhatsApp para cotizaciones</Texto>
        <Texto v="fino">Aquí te escriben los clientes. Solo se le entrega a quien te pide una cotización.</Texto>
        <Campo etiqueta="Número de WhatsApp" keyboardType="phone-pad" placeholder="300 123 4567" value={f.whatsapp} onChangeText={(v) => cambiar({ whatsapp: v })} autoComplete="tel" />
      </Tarjeta>
      <Tarjeta>
        <Texto v="subtitulo">Entregas y técnico</Texto>
        <CamposEntrega f={f} cambiar={cambiar} />
        {f.tecnico.trim() && tecnico > 0 ? <Texto v="fino">El cliente verá «{f.tecnico.trim()}: {pesos(tecnico)} por día».</Texto> : null}
      </Tarjeta>
      <Tarjeta>
        <Texto v="subtitulo">Bodega</Texto>
        <Campo etiqueta="Dirección de la bodega" value={f.direccion} onChangeText={(v) => cambiar({ direccion: v })} />
        <Campo etiqueta="Horario (opcional)" placeholder="Lun a sáb, 8 a. m. – 6 p. m." value={f.horario} onChangeText={(v) => cambiar({ horario: v })} />
      </Tarjeta>
      {error ? <Aviso tono="mal" texto={error} /> : null}
      {guardado ? <Aviso tono="ok" texto="Listo: tus tarifas quedaron guardadas." /> : null}
      <Boton titulo="Guardar tarifas" bloque cargando={ocupado} onPress={guardar} />
    </Pantalla>
  );
}
