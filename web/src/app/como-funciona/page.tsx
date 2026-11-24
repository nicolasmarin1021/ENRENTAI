import type { Metadata } from "next";
import Link from "next/link";
import { VieneFull } from "@/components/inicio/viene-full";
import { Ico, ICONOS, v } from "@/components/inicio/piezas";
import s from "./como.module.css";

export const metadata: Metadata = {
  title: "Cómo funciona la BETA",
  description: "ENRENTA BETA conecta a quien necesita equipos para espectáculos con las compañías que los rentan en Medellín.",
};

const CLIENTE = [
  { t: "Arma tu rider", x: "Elige qué necesitas, las fechas y el lugar del show. El mapa te muestra las compañías con equipo libre." },
  { t: "Cotiza por WhatsApp", x: "Con un clic se abre WhatsApp con tu rider, fechas y lugar ya escritos." },
  { t: "Acuerda con la compañía", x: "Precio final, forma de pago, entrega y recogida." },
  { t: "Queda apartado", x: "Cuando la compañía marca tu solicitud como rentada, el equipo queda reservado para ti." },
];

const COMPANIA = [
  { t: "Registra tu compañía", x: "Con tu WhatsApp, que es donde te llegan las cotizaciones." },
  { t: "Publica tu inventario", x: "Fotos, unidades y precio por día, más tus tarifas de transporte y técnico." },
  { t: "Responde y aparta", x: "Cuando cierres el trato, marca la solicitud como rentada para apartar el equipo en tu agenda." },
];

const CONDICIONES = [
  { ico: ICONOS.escudo, t: "ENRENTA no cobra ni recibe pagos", x: "El alquiler y cualquier garantía se acuerdan y se pagan directamente entre cliente y compañía." },
  { ico: ICONOS.pdf, t: "No somos parte del contrato", x: "Precio, horarios, estado del equipo, daños y faltantes los acuerdan cliente y compañía." },
  { ico: ICONOS.lupa, t: "Los precios son de referencia", x: "Los publica cada compañía y pueden cambiar en la cotización final." },
  { ico: ICONOS.chat, t: "Tus datos", x: "El WhatsApp de una compañía solo se entrega a quien le pide cotización, y ella ve tu número. Usamos tus datos solo para que ENRENTA funcione." },
];

function Pasos({ lista }: { lista: { t: string; x: string }[] }) {
  return (
    <ol className={s.pasos}>
      {lista.map((p, i) => (
        <li key={p.t} style={v({ "--i": i })}>
          <span className={s.num}>{i + 1}</span>
          <span className={s.txt}>
            <b>{p.t}</b>
            <span>{p.x}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

// Reglas de la BETA (modelo de conexión). Texto provisional mientras dure la BETA.
export default function ComoFunciona() {
  return (
    <div className={s.pagina}>
      <header className={s.cab}>
        <span className="beta">BETA</span>
        <h1 className="title-xl">
          Cómo funciona <em>ENRENTA</em>
        </h1>
        <p className="lead">
          Conectamos a quien necesita equipos para un show con las compañías que los rentan en Medellín.
        </p>
        <ul className={s.claves} aria-label="Lo esencial de la BETA">
          <li>
            <Ico d={ICONOS.check} size={14} grueso={2.6} /> Gratis durante la BETA
          </li>
          <li>
            <Ico d={ICONOS.chat} size={14} /> El precio y el pago se acuerdan por WhatsApp
          </li>
        </ul>
      </header>

      <div className={s.dos}>
        <section className={`${s.panel} ${s.cliente}`} aria-labelledby="como-necesito">
          <h2 id="como-necesito">
            <span className={s.chipo}>
              <Ico d={ICONOS.mic} size={18} />
            </span>
            Si necesitas equipos
          </h2>
          <Pasos lista={CLIENTE} />
          <Link href="/explorar" className="btn primary">
            Buscar equipos
          </Link>
        </section>

        <section className={s.panel} aria-labelledby="como-tengo">
          <h2 id="como-tengo">
            <span className={s.chipo}>
              <Ico d="M3 9.5 12 4l9 5.5V20H3zM7.5 20v-6.5h9V20M7.5 16.8h9" size={18} />
            </span>
            Si tienes equipos
          </h2>
          <Pasos lista={COMPANIA} />
          <Link href="/tengo" className="btn">
            Publicar mi inventario
          </Link>
        </section>
      </div>

      <section aria-labelledby="como-condiciones">
        <h2 id="como-condiciones" className={s.h2}>
          Condiciones de la BETA
        </h2>
        <ul className={s.reglas}>
          {CONDICIONES.map((c, i) => (
            <li key={c.t} style={v({ "--i": i })}>
              <span className={s.reglaIco}>
                <Ico d={c.ico} size={20} grueso={1.7} />
              </span>
              <b>{c.t}</b>
              <span>{c.x}</span>
            </li>
          ))}
        </ul>
        <p className="fine">
          Son provisionales mientras dure la BETA. Los términos completos y la política de tratamiento de datos personales se
          publicarán antes del lanzamiento.
        </p>
      </section>

      <VieneFull />
    </div>
  );
}
