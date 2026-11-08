import type { Metadata } from "next";
import { Proximamente } from "@/components/proximamente";

export const metadata: Metadata = { title: "Chats" };

export default function Chats() {
  return (
    <Proximamente
      titulo="Chats"
      texto="Hablarás directamente con cada compañía a la que le rentes, sin compartir tu número."
      puntos={[
        "Un chat por reserva, con la compañía y soporte de ENRENTA",
        "Avisos automáticos de cada paso: solicitud, confirmación, salida, devolución",
        "Fotos y ubicación del montaje dentro de la conversación",
      ]}
    />
  );
}
