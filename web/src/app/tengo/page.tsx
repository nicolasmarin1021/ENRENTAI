import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Tengo equipos" };

// Por ahora solo la entrada; el registro real de compañías llega con la base de datos.
export default function Tengo() {
  return (
    <section style={{ maxWidth: 560, margin: "0 auto", display: "grid", gap: 18 }}>
      <Link href="/" className="back-link">← Volver</Link>
      <h1 className="title-xl">
        Entra con tu <em>compañía</em>
      </h1>
      <p className="lead">Publica tu inventario, responde solicitudes y coordina entregas.</p>
      <p className="note">
        Aquí va el acceso y el registro de compañías (con la dirección de la bodega y la verificación). Lo conectamos en el siguiente paso, junto con la base de datos.
      </p>
    </section>
  );
}
