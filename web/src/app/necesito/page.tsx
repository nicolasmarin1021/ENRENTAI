import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Necesito equipos" };

// Por ahora solo la entrada; el inicio de sesión real llega con la base de datos.
export default function Necesito() {
  return (
    <section style={{ maxWidth: 560, margin: "0 auto", display: "grid", gap: 18 }}>
      <Link href="/" className="back-link">← Volver</Link>
      <h1 className="title-xl">
        Entra para <em>rentar</em>
      </h1>
      <p className="lead">Con tu cuenta pagas, sigues tus reservas y chateas con las compañías.</p>
      <p className="note">
        Aquí va el inicio de sesión real con un código que llega a tu correo. Lo conectamos en el siguiente paso, junto con la base de datos.
      </p>
    </section>
  );
}
