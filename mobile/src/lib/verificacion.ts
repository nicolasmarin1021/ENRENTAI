import { supabase } from "./supabase";

// Verificación de identidad con revisión manual (supabase/migrations/0012_verificacion_identidad.sql).
// Es opcional: quien la hace gana la insignia de verificado. Las fotos van a un bucket privado
// ("verificaciones") y se borran cuando un admin termina de revisarlas.

export type TipoVerificacion = "cliente" | "compania";
export type EstadoVerificacion = "pendiente" | "aprobada" | "rechazada";

export type Verificacion = {
  id: string;
  tipo: TipoVerificacion;
  estado: EstadoVerificacion;
  motivo: string | null;
  creado: string;
  revisado: string | null;
};

// Lo que la persona ve de su verificación: si ya está verificada y su última solicitud.
export type MiVerificacion = { verificado: boolean; ultima: Verificacion | null; faltaSql: boolean };

const sinTabla = (code?: string) => code === "PGRST205" || code === "42P01" || code === "42703";

// Cliente: la identidad está verificada si perfiles.identidad_verificada tiene fecha.
// Compañía: el sello companias.verificada (se pasa desde la sesión).
export async function miVerificacion(uid: string, tipo: TipoVerificacion, companiaVerificada = false): Promise<MiVerificacion> {
  const [v, p] = await Promise.all([
    supabase
      .from("verificaciones")
      .select("id, tipo, estado, motivo, creado, revisado")
      .eq("usuario", uid)
      .eq("tipo", tipo)
      .order("creado", { ascending: false })
      .limit(1)
      .maybeSingle(),
    tipo === "cliente" ? supabase.from("perfiles").select("identidad_verificada").eq("id", uid).maybeSingle() : Promise.resolve(null),
  ]);
  const faltaSql = sinTabla(v.error?.code) || sinTabla(p?.error?.code);
  const verificado =
    tipo === "cliente" ? !!(p?.data as { identidad_verificada: string | null } | null)?.identidad_verificada : companiaVerificada;
  return { verificado, ultima: (v.data as Verificacion | null) ?? null, faltaSql };
}

// Para la revisión del admin.
export type Pendiente = {
  id: string;
  tipo: TipoVerificacion;
  usuario: string;
  nombre: string;
  correo: string | null;
  compania: string | null;
  nit: string | null;
  archivos: string[];
  creado: string;
};

export async function verificacionesPendientes(): Promise<{ lista: Pendiente[]; error: string }> {
  const { data, error } = await supabase.rpc("verificaciones_pendientes");
  if (error) {
    return {
      lista: [],
      error: error.code === "PGRST202" ? "Falta ejecutar el SQL 0012_verificacion_identidad.sql en Supabase." : "No pudimos cargar las verificaciones.",
    };
  }
  return { lista: (data ?? []) as Pendiente[], error: "" };
}

// Enlaces temporales (10 minutos) para ver las fotos privadas.
export async function urlsFirmadas(rutas: string[]): Promise<Record<string, string>> {
  if (!rutas.length) return {};
  const { data } = await supabase.storage.from("verificaciones").createSignedUrls(rutas, 600);
  const mapa: Record<string, string> = {};
  for (const f of data ?? []) if (f.path && f.signedUrl) mapa[f.path] = f.signedUrl;
  return mapa;
}

// Dónde consulta el admin (las dos son consultas públicas y gratuitas). En la página de la
// Registraduría está el botón "Certificado de vigencia de la cédula".
export const CONSULTA_CEDULA = "https://www.registraduria.gov.co/";
export const CONSULTA_NIT = "https://www.rues.org.co/";

// Motivos de rechazo frecuentes (el admin también puede escribir uno propio).
export const MOTIVOS_RECHAZO = [
  "Una foto no se ve clara",
  "La selfie no coincide con la cédula",
  "Falta un lado de la cédula",
  "La cédula no aparece vigente",
  "El NIT no coincide con el documento",
];
