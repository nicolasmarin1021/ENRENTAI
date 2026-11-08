import type { Metadata } from "next";
import { Proximamente } from "@/components/proximamente";

export const metadata: Metadata = { title: "Tarifas" };

export default function Tarifas() {
  return (
    <Proximamente
      titulo="Tarifas"
      texto="Aquí ajustarás cuánto cobras además de los equipos."
      puntos={[
        "Porcentaje del depósito reembolsable",
        "Transporte: valor fijo o según la distancia (base + valor por km)",
        "Cobertura de entregas y opción de solo retiro en bodega",
        "Técnico que ofreces y su tarifa por día",
      ]}
    />
  );
}
