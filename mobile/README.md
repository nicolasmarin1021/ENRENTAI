# ENRENTA BETA — app móvil (iPhone y Android)

App nativa hecha con **Expo** (React Native + TypeScript). Usa el **mismo proyecto de Supabase** que la web, así
que las cuentas, el inventario, las solicitudes y las reseñas son los mismos en la web y en el celular.

Tiene los dos modos de la BETA:

- **Necesito equipos (cliente):** Explorar (qué, cuándo y dónde → mapa y compañías con unidades libres), ficha de
  cada compañía y de cada equipo, Rider con **Cotizar por WhatsApp**, Mis solicitudes (cancelar, escribir por
  WhatsApp y calificar).
- **Tengo equipos (compañía):** Panel (marcar como rentada o «No se concretó», responder reseñas), Inventario con
  fotos desde la cámara o la galería, Tarifas (WhatsApp, transporte, técnico y bodega) y Registro de la compañía.

La agenda por días y los bloqueos de unidades siguen, por ahora, solo en la web.

## Probar la app en tu iPhone (Expo Go)

1. En el iPhone instala **Expo Go** desde el App Store.
2. El iPhone y el computador deben estar en la **misma red Wi‑Fi**.
3. En el computador (PowerShell), dentro de la carpeta del proyecto:

   ```powershell
   cd mobile
   npm install
   npx expo start
   ```

4. Escanea el código QR que aparece con la **cámara del iPhone** y toca «Abrir en Expo Go».
   Si Windows pregunta si deja que Node.js use la red, elige **Redes privadas** y permite.
5. Si no abre (red de oficina o de universidad), usa `npx expo start --tunnel`.

La app lee la URL y la publishable key de Supabase de `web/.env.local` (ver `app.config.ts`); no hay que copiarlas.

### Entrar con tu correo desde el celular

El correo de Supabase trae un enlace. Para que ese enlace abra la app, en Supabase ve a
**Authentication → URL Configuration → Redirect URLs** y agrega (una sola vez):

- `exp://**` (para Expo Go mientras desarrollamos)
- `enrenta://**` (para la app instalada)

Luego abre el correo **en el iPhone** y toca el enlace: se abre la app y entras sola. Mientras desarrollamos
también aparece «Usar la cuenta de prueba» (correo y contraseña de la cuenta de prueba).

## Estructura

- `src/app/` — las pantallas (cada archivo es una ruta de Expo Router).
  - `(tabs)/` — las pestañas de abajo: `explorar`, `rider`, `solicitudes` (cliente) · `panel`, `inventario`,
    `tarifas` (compañía) · `cuenta`.
  - `compania/[id]`, `equipo/[id]`, `equipo-editar/[id]`, `entrar`, `registro`, `como-funciona` — pantallas que
    se abren encima.
- `src/componentes/` — partes de pantallas (pasos del pedido, resultados, tarjeta de solicitud…).
- `src/lib/` — datos y reglas: sesión, catálogo, pedido, solicitudes, WhatsApp, fechas y pesos.
  `busqueda.ts`, `geo.ts`, `whatsapp.ts`, `zonas.ts` y `novedades.ts` son copias de los de `web/src/lib/`:
  si cambias uno, cambia también el otro.
- `src/ui/` — piezas visuales con la marca (botones, tarjetas, campos, logo, íconos y mapa).
- `src/tema.ts` — colores y fuente de la marca «Conector».

## Revisar el código

```powershell
npx tsc --noEmit
npx eslint src
```

## Publicar en las tiendas (más adelante)

Se compila en la nube con **EAS** (no hace falta un Mac): `npx eas-cli@latest build`. Se necesita una cuenta de
Apple Developer (US$99 al año) para el App Store y una de Google Play (US$25, una vez) para Android. Para esa versión
las variables de Supabase se configuran como `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
