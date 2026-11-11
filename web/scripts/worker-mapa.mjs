// Copia el "worker" de MapLibre a public/maplibre/ para que Next lo sirva como archivo.
// MapLibre 6 lo busca junto a su propio código, y dentro del empaquetado de Next esa
// ruta no existe; por eso el mapa lo pide en /maplibre/ (ver src/components/mapa.tsx).
// Corre solo en postinstall, predev y prebuild.
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const raiz = dirname(require.resolve("maplibre-gl/package.json"));
const { version } = JSON.parse(readFileSync(join(raiz, "package.json"), "utf8"));
const destino = join(process.cwd(), "public", "maplibre");
const nombre = `maplibre-gl-worker-${version}.js`;

mkdirSync(destino, { recursive: true });
for (const f of readdirSync(destino)) if (f !== nombre) rmSync(join(destino, f));
copyFileSync(join(raiz, "dist", "maplibre-gl-worker.mjs"), join(destino, nombre));
console.log(`Worker del mapa listo: public/maplibre/${nombre}`);
