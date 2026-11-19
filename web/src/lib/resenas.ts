// Reseñas de las compañías (ver supabase/migrations/0009_beta_resenas.sql).

export type ResumenResenas = { promedio: number; total: number };

export type Resena = {
  id: string;
  reserva_id: string;
  compania_id: string;
  autor_nombre: string;
  estrellas: number;
  comentario: string | null;
  respuesta: string | null;
  respondida: string | null;
  creado: string;
};

// Columnas públicas (el id del autor no se expone).
export const SELECT_RESENA = "id, reserva_id, compania_id, autor_nombre, estrellas, comentario, respuesta, respondida, creado";

export const promedioTexto = (p: number) =>
  p.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

// "★ 4,8 (12)" o null si aún no tiene reseñas.
export const textoResumen = (r: ResumenResenas | null | undefined) =>
  r && r.total > 0 ? `★ ${promedioTexto(r.promedio)} (${r.total})` : null;
