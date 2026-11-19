import type { Metadata } from "next";
import Link from "next/link";
import { AbrirAnuncio } from "@/components/anuncio-full";
import { ListaNovedades } from "@/components/novedades";

export const metadata: Metadata = {
  title: "Cómo funciona la BETA",
  description: "ENRENTA BETA conecta a quien necesita equipos de audio y RF con las compañías que los rentan en Medellín.",
};

// Reglas de la BETA (modelo de conexión). Texto provisional mientras dure la BETA.
export default function ComoFunciona() {
  return (
    <section className="page-mid como-pagina">
      <div>
        <span className="beta">BETA</span>
        <h1 className="title-lg">Cómo funciona ENRENTA</h1>
        <p className="lead">
          ENRENTA conecta a quien necesita equipos de audio y RF para un show con las compañías que los rentan en Medellín.
          Durante la BETA, el precio final y el pago se acuerdan directamente entre las dos partes por WhatsApp.
        </p>
      </div>

      <div className="card">
        <h2>Si necesitas equipos</h2>
        <ol className="pasos-como">
          <li>
            <b>Busca y arma tu rider.</b> Elige qué necesitas, las fechas y el lugar del show. Verás en el mapa las compañías
            con unidades libres en esas fechas y sus precios de referencia.
          </li>
          <li>
            <b>Pide la cotización por WhatsApp.</b> Con un clic se abre WhatsApp con tu rider, fechas y lugar ya escritos para
            cada compañía.
          </li>
          <li>
            <b>Acuerda con la compañía.</b> Precio final, forma de pago, horarios de entrega y recogida.
          </li>
          <li>
            <b>Queda apartado.</b> Cuando la compañía marca tu solicitud como rentada, el equipo queda reservado para ti en su
            agenda. Puedes seguirla en <Link href="/necesito/reservas">Mis solicitudes</Link>.
          </li>
        </ol>
        <Link href="/explorar" className="btn primary" style={{ justifySelf: "start" }}>
          Buscar equipos
        </Link>
      </div>

      <div className="card">
        <h2>Si tienes equipos</h2>
        <ol className="pasos-como">
          <li>
            <b>Registra tu compañía y tu WhatsApp.</b> Ahí te llegan las cotizaciones.
          </li>
          <li>
            <b>Publica tu inventario</b> con fotos, unidades y precio por día, y define tus tarifas de referencia: transporte
            y técnico.
          </li>
          <li>
            <b>Responde por WhatsApp</b> y, cuando cierres el trato, marca la solicitud como rentada para apartar el equipo
            en tu agenda. Si no se concreta, márcala así.
          </li>
        </ol>
        <Link href="/tengo" className="btn" style={{ justifySelf: "start" }}>
          Publicar mi inventario
        </Link>
      </div>

      <div className="card">
        <h2>Condiciones de la BETA</h2>
        <ul className="lista-proximamente">
          <li>
            <b>ENRENTA no cobra ni recibe pagos.</b> El alquiler y cualquier garantía que pida la compañía se acuerdan y se
            pagan directamente entre el cliente y la compañía.
          </li>
          <li>
            <b>ENRENTA no es parte del contrato de alquiler.</b> Las condiciones (precio, horarios, estado del equipo, daños y
            faltantes) las acuerdan el cliente y la compañía.
          </li>
          <li>
            <b>Los precios que ves son de referencia.</b> Los publica cada compañía y pueden cambiar en la cotización final.
          </li>
          <li>
            <b>Tus datos.</b> El WhatsApp de una compañía solo se le entrega a quien le pide una cotización. Cuando escribes
            por WhatsApp, la compañía ve tu número. Usamos tus datos solo para que ENRENTA funcione.
          </li>
          <li>
            <b>Gratis durante la BETA</b> para clientes y compañías.
          </li>
        </ul>
        <p className="fine">
          Estas condiciones son provisionales mientras dure la BETA. Los términos completos y la política de tratamiento de
          datos personales se publicarán antes del lanzamiento.
        </p>
      </div>

      <div className="card como-viene">
        <span className="como-viene-pill">Próximamente</span>
        <h2>Lo que viene en ENRENTA completa</h2>
        <p className="muted">
          La versión completa cuidará cada renta de principio a fin, con ENRENTA en el medio para que clientes y compañías
          renten con tranquilidad.
        </p>
        <ListaNovedades className="en-pagina" />
        <AbrirAnuncio texto="Ver el anuncio" />
      </div>
    </section>
  );
}
