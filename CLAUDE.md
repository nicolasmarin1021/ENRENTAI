# ENRENTA · guía para Claude

Marketplace para rentar equipos de audio y RF en Medellín. Hoy funciona la **BETA** (modelo de conexión):
el cliente arma su pedido, ve compañías con equipo libre y cotiza por WhatsApp; ENRENTA no cobra ni pide depósito.
El modelo completo (pagos, depósitos) está guardado en la rama `modelo-full` y el tag `modelo-full-v1`.

## Cómo trabajar con la dueña del proyecto
- Responder **siempre en español**, en palabras sencillas: no programa. Mensajes cortos.
- Hacer commit y push **solo cuando lo pida**. Se trabaja en la rama `beta` (nunca en `main`).
- Para ahorrar consumo: no probar en el navegador los cambios pequeños salvo que lo pida; juntar pasos.
- Nunca pedir ni escribir contraseñas, ni imprimir las claves de `web/.env.local`. No entrar con su cuenta:
  las pantallas que necesitan sesión se prueban con una página temporal `mobile/src/app/zz-prueba.tsx`
  con datos de ejemplo, que se borra al terminar.

## Estructura
- `web/` — Next.js 16 + Supabase (la web de la BETA).
- `mobile/` — app Expo SDK 58 (iPhone con Expo Go): rutas en `src/app` (expo-router), React Compiler.
  - Pestañas cliente: `buscar` (Buscar equipos + subpanel Explorar), `guardados`, `rider`, `solicitudes`.
    Compañía: `panel`, `inventario`, `tarifas`. Siempre: `cuenta`. Selector Necesito | Tengo arriba a la derecha.
  - UI propia en `src/ui/base.tsx` (Texto, Boton, Campo, Chip, Aviso, Tarjeta, Pantalla…), colores en `src/tema.ts`.
  - Datos en `src/lib/` (catalogo, pedido, sesion, perfil, calificaciones, verificacion…). Fechas a mano (Colombia, UTC−5).
- `supabase/migrations/` — SQL 0001 a 0014. La dueña los ejecuta en el SQL Editor de Supabase (0001 a 0013 ya
  ejecutados; 0014, preguntas por chat, puede estar pendiente). Si falta un SQL, la app muestra «Falta ejecutar el SQL 00XX…».

## Comandos (Windows)
- PowerShell bloquea `npm.ps1`: usar `npm.cmd` / `npx.cmd`. En Bash: `export PATH="/c/Program Files/nodejs:$PATH"`.
- No usar `node -e` con comillas invertidas desde Bash (ha dañado archivos): editar con Edit/Write o scripts de Python.
- Revisar la app: en `mobile/`, `npx tsc --noEmit` y `npx eslint src app.config.ts` (no `npx expo lint`).
- Servidor para el iPhone: en `mobile/`, `npx.cmd expo start --clear` en una pestaña de terminal. La IP del
  computador cambia a veces: hay que escanear el QR nuevo. Vista previa en el navegador: `.claude/launch.json`,
  configuración `enrenta-movil-web`. Las rutas tipadas nuevas aparecen cuando el servidor está corriendo.

## Detalles que ya se decidieron
- Entrada en la app: correo + contraseña (registro con nombre, celular, correo y contraseña; Supabase confirma
  por correo). La web sigue con código al correo.
- La ubicación de cada compañía (pin en Tarifas) es la misma del mapa de Buscar equipos y Explorar.
- Chat interno (app): el cliente pregunta a una compañía sin cotizar (no aparta equipos) con «Hacer una pregunta»;
  bandeja en `mensajes` (acceso en Mis solicitudes y en el Panel), conversación en `chat/[id]`. La web aún no lo tiene.
- Cotización en PDF (como la web): `mobile/src/lib/cotizacion.ts` (expo-print + expo-sharing). Botón en el Rider (junto a Agendar) y en cada solicitud (cliente y compañía).
- Mapa (app): MapLibre + OpenFreeMap (gratis, sin claves) dentro de una vista web, igual en iPhone y Android: `mobile/src/ui/mapa.tsx` y `mapa-html.ts`. Necesita internet.
- En el mapa no se muestran precios sino referencias de equipo (exacto o «≈» equivalente).
- La web ya tiene, como la app: subpaneles Buscar equipos | Explorar (`/explorar?vista=explorar`, lista o mapa),
  Guardados (♡, en el navegador, `/guardados`) y la verificación de identidad (`/necesito/verificacion`,
  `/tengo/verificacion`, revisión en `/admin/verificaciones`). Todavía no muestra el perfil del cliente ni sus calificaciones.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. When the answer is under a Markdown heading, `graphify section "<heading>"` prints that section's text, so the .md need not be opened. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost). On this computer graphify is at `C:\Users\Maria Fernanda\AppData\Roaming\Python\Python312\Scripts\graphify.exe` (not on PATH).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
