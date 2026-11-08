"use client";

import { useState } from "react";
import type { DatosDoc } from "@/lib/pdf";

type Props = {
  // El número y la fecha de emisión se ponen al descargar.
  datos: Omit<DatosDoc, "emitido" | "numero" | "validoHasta"> & { numero?: string };
  texto: string;
  className?: string;
};

const DIA = 24 * 60 * 60 * 1000;
const dos = (n: number) => String(n).padStart(2, "0");

// Genera el PDF en el navegador (la librería se carga solo al hacer clic).
export function BotonPDF({ datos, texto, className = "btn" }: Props) {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");

  async function descargar() {
    setOcupado(true);
    setError("");
    try {
      const { generarPDF, nombreArchivo } = await import("@/lib/pdf");
      const ahora = new Date();
      const numero =
        datos.numero ??
        `COT-${ahora.getFullYear()}${dos(ahora.getMonth() + 1)}${dos(ahora.getDate())}-${Math.floor(1000 + Math.random() * 9000)}`;
      const d: DatosDoc = {
        ...datos,
        numero,
        emitido: ahora.toISOString(),
        validoHasta: datos.tipo === "cotizacion" ? new Date(+ahora + 3 * DIA).toISOString() : undefined,
      };
      generarPDF(d).save(nombreArchivo(d));
    } catch {
      setError("No pudimos generar el PDF. Intenta de nuevo.");
    }
    setOcupado(false);
  }

  return (
    <>
      <button type="button" className={className} onClick={descargar} disabled={ocupado}>
        {ocupado ? "Generando PDF…" : texto}
      </button>
      {error && <span className="form-err" role="alert">{error}</span>}
    </>
  );
}
