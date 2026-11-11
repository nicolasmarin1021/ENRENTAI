import type { Metadata } from "next";
import { Proximamente } from "@/components/proximamente";

export const metadata: Metadata = { title: "Pagos" };

export default function Pagos() {
  return (
    <Proximamente
      titulo="Pagos"
      texto="Todo lo que pagaste, lo que está en garantía y lo que te devolvieron."
      puntos={[
        "Pago de la reserva en modo de prueba, y luego con una pasarela colombiana",
        "El dinero queda en garantía y se libera a la compañía al registrar la devolución",
        "Devolución del depósito al cerrar la entrega sin casos abiertos",
        "Medios de pago guardados",
      ]}
    />
  );
}
