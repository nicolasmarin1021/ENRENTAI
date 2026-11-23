import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
  useFonts,
} from "@expo-google-fonts/space-grotesk";
import { DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { CatalogoProvider } from "@/lib/catalogo";
import { GuardadosProvider } from "@/lib/guardados";
import { PedidoProvider } from "@/lib/pedido";
import { SesionProvider } from "@/lib/sesion";
import { color, fuente } from "@/tema";

// Raíz de la app: carga la fuente de la marca y comparte la sesión, el catálogo y el pedido
// con todas las pantallas. Las pestañas viven en (tabs)/; el resto se abre encima.

SplashScreen.preventAutoHideAsync().catch(() => {});

const TEMA = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, primary: color.acento, background: color.fondo, card: color.superficie, text: color.tinta, border: color.linea },
};

export default function Raiz() {
  const [fuentesListas, fallo] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    if (fuentesListas || fallo) SplashScreen.hideAsync().catch(() => {});
  }, [fuentesListas, fallo]);

  if (!fuentesListas && !fallo) return null;

  return (
    <SesionProvider>
      <CatalogoProvider>
        <PedidoProvider>
          <GuardadosProvider>
          <ThemeProvider value={TEMA}>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerTintColor: color.acento,
                headerTitleStyle: { fontFamily: fuente[600], color: color.tinta },
                headerBackButtonDisplayMode: "minimal",
                headerShadowVisible: false,
                headerStyle: { backgroundColor: color.fondo },
                contentStyle: { backgroundColor: color.fondo },
              }}
            >
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="bienvenida" options={{ headerShown: false, presentation: "fullScreenModal" }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="compania/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="equipo/[id]" options={{ presentation: "modal", headerShown: false }} />
              <Stack.Screen name="entrar" options={{ presentation: "modal", headerShown: false }} />
              <Stack.Screen name="como-funciona" options={{ title: "Cómo funciona" }} />
              <Stack.Screen name="registro" options={{ title: "Registrar compañía" }} />
              <Stack.Screen name="perfil" options={{ title: "Tu perfil" }} />
              <Stack.Screen name="verificacion" options={{ title: "Verificación" }} />
              <Stack.Screen name="admin-verificaciones" options={{ title: "Verificaciones" }} />
              <Stack.Screen name="equipo-editar/[id]" options={{ title: "Equipo" }} />
              <Stack.Screen name="mensajes" options={{ title: "Mensajes" }} />
              <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
            </Stack>
          </ThemeProvider>
          </GuardadosProvider>
        </PedidoProvider>
      </CatalogoProvider>
    </SesionProvider>
  );
}
