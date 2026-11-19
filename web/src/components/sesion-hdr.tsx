import { getSesion, iniciales } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";
import { Navegacion, type DatosNav } from "./navegacion";

const SIN_CONTEOS: DatosNav["conteos"] = { misReservas: 0, porResponder: 0 };
const ahoraISO = () => new Date().toISOString();

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

  // Contadores de las pestañas. Si las solicitudes aún no existen en la base de datos, quedan en 0.
  const supabase = await createClient();
  const contar = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
  const reservas = () => supabase.from("reservas").select("id", { count: "exact", head: true });
  const [misReservas, porResponder] = await Promise.all([
    // Solicitudes activas: por confirmar o rentadas cuya recogida aún no pasa (igual que en "Mis solicitudes").
    contar(reservas().eq("cliente", s.id).in("estado", ["pendiente", "confirmada", "en_curso"]).gte("recogida", ahoraISO())),
    s.compania ? contar(reservas().eq("compania_id", s.compania.id).eq("estado", "pendiente")) : 0,
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
        conteos: { misReservas, porResponder },
      }}
    />
  );
}
