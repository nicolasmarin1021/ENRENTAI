/// <reference types="node" />
// (Este archivo corre en el computador con Node, no en el celular.)
import fs from "node:fs";
import path from "node:path";
import type { ExpoConfig } from "expo/config";

// Configuración de la app móvil de ENRENTA BETA (reemplaza a app.json).
//
// Supabase: la app usa el mismo proyecto que la web. Mientras desarrollamos, los valores
// públicos (URL y publishable key) se leen de web/.env.local, así no hay que copiarlos.
// Para compilar la app de las tiendas se definen como EXPO_PUBLIC_SUPABASE_URL y
// EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY (nunca la secret key ni la service_role key).
function leerEnvWeb(): Record<string, string> {
  try {
    const texto = fs.readFileSync(path.join(__dirname, "..", "web", ".env.local"), "utf8");
    const valores: Record<string, string> = {};
    for (const linea of texto.split(/\r?\n/)) {
      const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) valores[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
    return valores;
  } catch {
    return {};
  }
}

const web = leerEnvWeb();
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || web.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || web.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

const config: ExpoConfig = {
  name: "ENRENTA",
  slug: "enrenta",
  version: "0.1.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  // enrenta://… abre la app (lo usa el enlace del correo para entrar).
  scheme: "enrenta",
  userInterfaceStyle: "light",
  ios: {
    bundleIdentifier: "co.enrenta.app",
    supportsTablet: false,
  },
  android: {
    package: "co.enrenta.app",
    adaptiveIcon: {
      backgroundColor: "#E8ECFD",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
  },
  web: {
    output: "single",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#F7F8FC",
        image: "./assets/images/splash-icon.png",
        imageWidth: 96,
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission: "ENRENTA usa tus fotos para mostrar tus equipos en el inventario.",
        cameraPermission: "ENRENTA usa la cámara para tomar fotos de tus equipos.",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    supabaseUrl,
    supabaseKey,
  },
};

export default config;
