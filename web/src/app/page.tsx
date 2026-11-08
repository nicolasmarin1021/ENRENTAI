import Link from "next/link";
import { BrandMark } from "@/components/brand";
import styles from "./page.module.css";

// Lo que protege a quien renta; se muestra desde la primera pantalla.
const TRUST = [
  "Compañías verificadas",
  "Pago en garantía hasta la devolución",
  "Depósito reembolsable",
  "Soporte por chat",
];

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export default function Inicio() {
  return (
    <section className={styles.landing} aria-label="Inicio">
      <div className={styles.card}>
        <BrandMark size="lg" />
        <h1 className="title-xl">
          ¿Qué te trae a <em>ENRENTA</em>?
        </h1>
        <p className="lead">Renta y ofrece equipos de audio y RF para shows en Medellín.</p>

        <div className={styles.choices}>
          <Link href="/necesito" className={styles.choice}>
            <span className={styles.choiceIco}>
              <Icon d="M12 2.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zM9.6 9.2 10.8 21h2.4l1.2-11.8M10.2 13.5h3.6" />
            </span>
            <span className={styles.choiceTxt}>
              <b>Necesito equipos</b>
              <span>Busca y renta lo que necesitas para tu show</span>
            </span>
            <span className={styles.go} aria-hidden="true">→</span>
          </Link>
          <Link href="/tengo" className={styles.choice}>
            <span className={styles.choiceIco}>
              <Icon d="M3 9.5 12 4l9 5.5V20H3zM7.5 20v-6.5h9V20M7.5 16.8h9" />
            </span>
            <span className={styles.choiceTxt}>
              <b>Tengo equipos</b>
              <span>Publica tu inventario y recibe reservas</span>
            </span>
            <span className={styles.go} aria-hidden="true">→</span>
          </Link>
        </div>

        <ul className={styles.trust} aria-label="Cómo te protege ENRENTA">
          {TRUST.map((t) => (
            <li key={t}>
              <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m5 12.5 4.5 4.5L19 7.5" />
              </svg>
              {t}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
