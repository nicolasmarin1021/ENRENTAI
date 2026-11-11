"use client";

// Reduce la foto a 1600 px como máximo y la guarda como JPG (pesa mucho menos).
export async function prepararFoto(archivo: File): Promise<Blob> {
  const bmp = await createImageBitmap(archivo);
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const lienzo = document.createElement("canvas");
  lienzo.width = Math.round(bmp.width * k);
  lienzo.height = Math.round(bmp.height * k);
  lienzo.getContext("2d")!.drawImage(bmp, 0, 0, lienzo.width, lienzo.height);
  bmp.close();
  const blob = await new Promise<Blob | null>((r) => lienzo.toBlob(r, "image/jpeg", 0.82));
  if (!blob) throw new Error("No se pudo preparar la foto");
  return blob;
}
