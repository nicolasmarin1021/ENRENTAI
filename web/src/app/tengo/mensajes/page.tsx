import type { Metadata } from "next";
import { Proximamente } from "@/components/proximamente";

export const metadata: Metadata = { title: "Mensajes" };

export default function Mensajes() {
  return (
    <Proximamente
      titulo="Mensajes"
      texto="Conversaciones con los clientes de cada reserva y con soporte de ENRENTA."
      puntos={[
        "Un chat por reserva",
        "Avisos automáticos de solicitudes, confirmaciones y entregas",
        "Coordinación de horarios de entrega y recogida",
      ]}
    />
  );
}
