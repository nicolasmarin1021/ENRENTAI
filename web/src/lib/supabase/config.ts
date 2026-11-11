// Valores públicos del proyecto de Supabase (vienen de web/.env.local).
// Next.js los incrusta en el código del navegador, por eso solo van aquí claves publicables.
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

// Mientras no exista .env.local, la app funciona sin cuentas en vez de fallar.
export const supabaseConfigured = Boolean(supabaseUrl && supabaseKey);
