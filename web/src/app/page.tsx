import type { CSSProperties } from "react";
import Link from "next/link";
import { Simbolo } from "@/components/brand";
import { Companias } from "@/components/inicio/companias";
import { DemoPasos } from "@/components/inicio/demo-pasos";
import { mono } from "@/components/inicio/fuente";
import { Marquesina } from "@/components/inicio/marquesina";
import { VieneFull } from "@/components/inicio/viene-full";
import inicio from "@/components/inicio/inicio.module.css";
import styles from "./page.module.css";

// Lo que ofrece la BETA; se muestra desde la primera pantalla.
const TRUST = [
  "Compañías verificadas",
  "Disponibilidad real por fechas",
  "Cotiza por WhatsApp en un clic",
  "Gratis durante la BETA",
];

// Categorías que flotan a los lados de la portada (solo en pantallas anchas).
const FLOTANTES = [
  { cat: "MIC", nombre: "Micrófonos inalámbricos", pos: { left: "1%", top: "10%" }, t: 7 },
  { cat: "IEM", nombre: "In-ear", pos: { left: "8%", top: "44%" }, t: 8.5 },
  { cat: "PA", nombre: "Sistemas PA", pos: { left: "2%", top: "76%" }, t: 7.8 },
  { cat: "RF", nombre: "Antenas y distribución", pos: { right: "0%", top: "14%" }, t: 8.2 },
  { cat: "COORD", nombre: "Coordinación RF", pos: { right: "7%", top: "48%" }, t: 7.4 },
  { cat: "COM", nombre: "Intercom inalámbrico", pos: { right: "1%", top: "79%" }, t: 9 },
];

const retraso = (seg: number, extra?: Record<string, string | number | undefined>) => ({ "--d": `${seg}s`, ...extra }) as CSSProperties;

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export default function Inicio() {
  return (
    <div className={`portada ${inicio.inicio} ${mono.variable}`}>
      <section className={styles.landing} aria-label="Inicio">
        <div className={styles.flotantes} aria-hidden="true">
          {FLOTANTES.map((f, i) => (
            <span key={f.cat} className={styles.flota} style={retraso(0.6 + i * 0.12, { ...f.pos, "--t": `${f.t}s` })}>
              <b>{f.cat}</b>
              {f.nombre}
            </span>
          ))}
        </div>

        <div className={styles.card}>
          <span className={styles.emisor}>
            <Simbolo size={72} className={styles.simbolo} />
            <i aria-hidden="true" />
            <i aria-hidden="true" />
          </span>
          <h1 className={`title-xl ${styles.titulo} ${styles.entra}`} style={retraso(0.1)}>
            ¿Qué te trae a <em>ENRENTA</em>?
          </h1>
          <p className={`lead ${styles.entra}`} style={retraso(0.2)}>
            Renta y ofrece equipos de audio y RF para shows en Medellín.
          </p>

          <div className={styles.choices}>
            <Link href="/necesito" className={`${styles.choice} ${styles.entra}`} style={retraso(0.32)}>
              <span className={styles.choiceIco}>
                <Icon d="M12 2.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zM9.6 9.2 10.8 21h2.4l1.2-11.8M10.2 13.5h3.6" />
              </span>
              <span className={styles.choiceTxt}>
                <b>Necesito equipos</b>
                <span>Busca y renta lo que necesitas para tu show</span>
              </span>
              <span className={styles.go} aria-hidden="true">→</span>
            </Link>
            <Link href="/tengo" className={`${styles.choice} ${styles.entra}`} style={retraso(0.42)}>
              <span className={styles.choiceIco}>
                <Icon d="M3 9.5 12 4l9 5.5V20H3zM7.5 20v-6.5h9V20M7.5 16.8h9" />
              </span>
              <span className={styles.choiceTxt}>
                <b>Tengo equipos</b>
                <span>Publica tu inventario y recibe cotizaciones por WhatsApp</span>
              </span>
              <span className={styles.go} aria-hidden="true">→</span>
            </Link>
          </div>

          <ul className={styles.trust} aria-label="Qué ofrece ENRENTA">
            {TRUST.map((t, i) => (
              <li key={t} className={styles.entra} style={retraso(0.55 + i * 0.08)}>
                <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m5 12.5 4.5 4.5L19 7.5" />
                </svg>
                {t}
              </li>
            ))}
          </ul>
        </div>

        <a href="#como-funciona" className={styles.bajar}>
          <i aria-hidden="true" />
          Mira cómo funciona
        </a>
      </section>

      <Marquesina />

      <section id="como-funciona" className={inicio.seccion} aria-labelledby="inicio-pasos">
        <header className={`${inicio.cabeza} ${inicio.revela}`}>
          <span className={inicio.ceja}>Si necesitas equipos</span>
          <h2 id="inicio-pasos" className={inicio.h2}>
            Del rider a la cotización, <span className="hl">en cuatro pasos</span>
          </h2>
        </header>
        <DemoPasos />
      </section>

      <Companias />

      <VieneFull />

      <section className={`${inicio.final} ${inicio.revela}`} aria-labelledby="inicio-final">
        <Simbolo size={64} className={inicio.finalSimbolo} />
        <h2 id="inicio-final" className={inicio.h2}>
          ¿Listo para tu <span className="hl">próximo show</span>?
        </h2>
        <p>Gratis durante la BETA. Sin depósitos ni pagos en ENRENTA.</p>
        <div className={inicio.finalAcciones}>
          <Link href="/necesito" className="btn primary lg">
            Necesito equipos
          </Link>
          <Link href="/tengo" className="btn lg">
            Tengo equipos
          </Link>
        </div>
      </section>
    </div>
  );
}
