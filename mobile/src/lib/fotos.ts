import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import type { ImagePickerAsset } from "expo-image-picker";

// Fotos del inventario: se reducen a 1600 px como máximo y se guardan como JPG (pesan mucho
// menos), igual que en la web (web/src/lib/fotos.ts).

export type FotoLista = { uri: string; datos: ArrayBuffer };

export async function prepararFoto(a: ImagePickerAsset, max = 1600): Promise<FotoLista> {
  const lado = Math.max(a.width || 0, a.height || 0);
  const ctx = ImageManipulator.manipulate(a.uri);
  if (lado > max) ctx.resize(a.width >= a.height ? { width: max } : { height: max });
  const imagen = await ctx.renderAsync();
  const r = await imagen.saveAsync({ format: SaveFormat.JPEG, compress: 0.82, base64: true });
  if (!r.base64) throw new Error("No se pudo preparar la foto");
  return { uri: r.uri, datos: base64ABytes(r.base64) };
}

// Convierte texto base64 en bytes (lo que recibe Supabase Storage).
const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
export function base64ABytes(b64: string): ArrayBuffer {
  const limpio = b64.replace(/^data:[^,]+,/, "").replace(/[^A-Za-z0-9+/]/g, "");
  const largo = Math.floor((limpio.length * 3) / 4);
  const bytes = new Uint8Array(largo);
  let j = 0;
  for (let i = 0; i < limpio.length; i += 4) {
    const a = ALFABETO.indexOf(limpio[i]);
    const b = ALFABETO.indexOf(limpio[i + 1]);
    const c = ALFABETO.indexOf(limpio[i + 2] ?? "A");
    const d = ALFABETO.indexOf(limpio[i + 3] ?? "A");
    const n = (a << 18) | (b << 12) | ((c < 0 ? 0 : c) << 6) | (d < 0 ? 0 : d);
    if (j < largo) bytes[j++] = (n >> 16) & 255;
    if (j < largo && i + 2 < limpio.length) bytes[j++] = (n >> 8) & 255;
    if (j < largo && i + 3 < limpio.length) bytes[j++] = n & 255;
  }
  return bytes.buffer.slice(0, j);
}
