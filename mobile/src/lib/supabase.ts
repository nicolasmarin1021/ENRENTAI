import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";
import { AppState, Platform } from "react-native";

// Conexión con el mismo proyecto de Supabase que usa la web.
// Los valores vienen de app.config.ts (que los lee de web/.env.local o de EXPO_PUBLIC_*).
const extra = (Constants.expoConfig?.extra ?? {}) as { supabaseUrl?: string; supabaseKey?: string };
export const supabaseUrl = extra.supabaseUrl ?? "";
const supabaseKey = extra.supabaseKey ?? "";

// Sin web/.env.local la app abre igual, pero sin datos ni cuentas.
export const supabaseConfigurado = Boolean(supabaseUrl && supabaseKey);

export const supabase = createClient(supabaseUrl || "https://sin-configurar.supabase.co", supabaseKey || "sin-clave", {
  auth: {
    // La sesión se guarda en el celular para no tener que entrar cada vez.
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // En el celular el enlace del correo no llega a una página web: lo procesa sesion.tsx.
    detectSessionInUrl: false,
  },
});

// Renueva la sesión solo mientras la app está abierta en pantalla (recomendación de Supabase).
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (estado) => {
    if (estado === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

// Mensaje para la persona a partir de un error de Supabase: los de nuestras funciones (P0001)
// ya vienen en español; el resto se reemplaza por uno genérico.
export function mensajeError(e: { code?: string; message?: string } | null | undefined, generico: string) {
  if (!e) return generico;
  if (e.code === "P0001" && e.message) return e.message;
  if (e.code === "PGRST202") return "Falta ejecutar un SQL de la BETA en Supabase (0008 o 0009).";
  if (e.message && /network|fetch/i.test(e.message)) return "Sin conexión. Revisa tu internet e intenta de nuevo.";
  return generico;
}
