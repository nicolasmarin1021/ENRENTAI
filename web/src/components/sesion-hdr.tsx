import { getSesion, iniciales } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";
import { Navegacion, type DatosNav } from "./navegacion";

const SIN_CONTEOS: DatosNav["conteos"] = {
  misReservas: 0,
  entregasCliente: 0,
  porResponder: 0,
  entregasCompania: 0,
  chatsCliente: 0,
  chatsCompania: 0,
};

// Parte del encabezado que depende de la sesión (va dentro de un <Suspense>).
export async function SesionHdr() {
  const s = await getSesion();
  if (!s) {
    return (
      <Navegacion
        datos={{ conSesion: false, nombre: "", correo: "", iniciales: "", admin: false, compania: null, conteos: SIN_CONTEOS }}
      />
    );
  }

  // Contadores de las pestañas. Si las reservas aún no existen en la base de datos, quedan en 0.
  const supabase = await createClient();
  const contar = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
  const reservas = () => supabase.from("reservas").select("id", { count: "exact", head: true });
  // Mensajes sin leer en Chats (cliente) y Mensajes (compañía); 0 si el chat aún no existe en la base de datos.
  const sinLeer = async (lado: "cliente" | "compania") => {
    const { data, error } = await supabase.rpc("chats_sin_leer", { p_lado: lado });
    return error ? 0 : Number(data ?? 0);
  };
  const [misReservas, entregasCliente, porResponder, entregasCompania, chatsCliente, chatsCompania] = await Promise.all([
    contar(reservas().eq("cliente", s.id).in("estado", ["pendiente", "confirmada", "en_curso"])),
    contar(reservas().eq("cliente", s.id).eq("estado", "en_curso")),
    s.compania ? contar(reservas().eq("compania_id", s.compania.id).eq("estado", "pendiente")) : 0,
    s.compania ? contar(reservas().eq("compania_id", s.compania.id).in("estado", ["confirmada", "en_curso"])) : 0,
    sinLeer("cliente"),
    s.compania ? sinLeer("compania") : 0,
  ]);

  return (
    <Navegacion
      datos={{
        conSesion: true,
        nombre: s.nombre,
        correo: s.correo,
        iniciales: iniciales(s.nombre || s.correo),
        admin: s.admin,
        compania: s.compania ? { nombre: s.compania.nombre, iniciales: iniciales(s.compania.nombre) } : null,
        conteos: { misReservas, entregasCliente, porResponder, entregasCompania, chatsCliente, chatsCompania },
      }}
    />
  );
}
