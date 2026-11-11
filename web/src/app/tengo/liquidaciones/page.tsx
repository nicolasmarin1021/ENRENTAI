import type { Metadata } from "next";
import { Proximamente } from "@/components/proximamente";

export const metadata: Metadata = { title: "Liquidaciones" };

export default function Liquidaciones() {
  return (
    <Proximamente
      titulo="Liquidaciones"
      texto="Lo que ENRENTA te paga por cada reserva, con la comisión del 10 % ya descontada."
      puntos={[
        "Por liquidar: reservas confirmadas o en curso",
        "Liquidado: pagos hechos a tu cuenta, mes a mes",
        "Descarga de cada liquidación en PDF",
      ]}
    />
  );
}
