"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { EscenaApartado, EscenaMapa, EscenaRider, EscenaWhatsApp } from "./escenas";
import { v } from "./piezas";
import s from "./inicio.module.css";

// Demo de la portada: los cuatro pasos para rentar, con un celular que los muestra en vivo.
// Pasa solo de un paso al siguiente (la barra de cada paso marca el tiempo). Con el ratón encima
// o navegando con teclado no cambia de paso (para dejar leer); fuera de la pantalla o con el botón
// Pausar se congela todo.

const DURACION = 7; // segundos por paso

const PASOS = [
  {
    titulo: "Arma tu rider",
    texto: "Busca por marca, modelo o tipo de equipo y elige cuántos necesitas, las fechas y el lugar del show.",
    nota: "Busca por marca o modelo",
    lado: "izq",
    Escena: EscenaRider,
  },
  {
    titulo: "Mira quién lo tiene libre",
    texto: "El mapa te muestra las compañías con unidades libres en tus fechas y qué referencia tiene cada una.",
    nota: "Solo compañías con fechas libres",
    lado: "der",
    Escena: EscenaMapa,
  },
  {
    titulo: "Cotiza por WhatsApp",
    texto: "Con un clic se abre WhatsApp con tu rider, fechas y lugar ya escritos. El precio final lo acuerdas con la compañía.",
    nota: "El mensaje ya va escrito",
    lado: "izq",
    Escena: EscenaWhatsApp,
  },
  {
    titulo: "Queda apartado",
    texto: "Cuando la compañía marca tu solicitud como rentada, el equipo queda reservado para ti. Descarga la cotización en PDF.",
    nota: "Tu cotización, lista en PDF",
    lado: "der",
    Escena: EscenaApartado,
  },
] as const;

export function DemoPasos() {
  const [paso, setPaso] = useState(0);
  const [vuelta, setVuelta] = useState(0); // cambia para que las animaciones empiecen de nuevo
  const [visible, setVisible] = useState(false);
  const [encima, setEncima] = useState(false);
  const [teclado, setTeclado] = useState(false);
  const [detenido, setDetenido] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const ir = (i: number) => {
    setPaso(i);
    setVuelta((n) => n + 1);
  };
  const congelado = detenido || !visible;
  const espera = encima || teclado;
  const actual = PASOS[paso];
  const Escena = actual.Escena;

  return (
    <div
      ref={ref}
      className={`${s.demo} ${s.revela}`}
      data-pausa={congelado ? "" : undefined}
      data-espera={espera ? "" : undefined}
      style={v({ "--dur": `${DURACION}s` })}
      onPointerEnter={(e) => e.pointerType === "mouse" && setEncima(true)}
      onPointerLeave={() => setEncima(false)}
      onFocus={(e) => e.target.matches(":focus-visible") && setTeclado(true)}
      onBlur={() => setTeclado(false)}
    >
      <div className={s.lado}>
        <ol className={s.pasos}>
          {PASOS.map((p, i) => (
            <li key={p.titulo}>
              <button type="button" className={s.paso} aria-current={i === paso ? "step" : undefined} onClick={() => ir(i)}>
                <span className={s.num}>{i + 1}</span>
                <b>{p.titulo}</b>
                <span className={s.pasoTxt}>
                  <span>{p.texto}</span>
                </span>
                <span className={s.barra} aria-hidden="true">
                  {i === paso && <i key={vuelta} onAnimationEnd={() => ir((paso + 1) % PASOS.length)} />}
                </span>
              </button>
            </li>
          ))}
        </ol>
        <div className={s.ladoPie}>
          <Link href="/explorar" className="btn primary lg">
            Buscar equipos
          </Link>
          <button type="button" className={s.control} onClick={() => setDetenido((x) => !x)}>
            {detenido ? "▶ Reproducir" : "❚❚ Pausar"}
          </button>
        </div>
      </div>

      <div className={s.escenario} aria-hidden="true">
        <div className={s.telefono}>
          <div className={s.pantalla}>
            <div className={s.estado}>
              <span>9:41</span>
              <span className={s.estadoIco}>
                <i />
                <i />
                <i />
                <b />
              </span>
            </div>
            <div className={s.escena} key={vuelta}>
              <Escena />
            </div>
          </div>
        </div>
        <span key={`n${vuelta}`} className={`${s.nota} ${actual.lado === "der" ? s.notaDer : s.notaIzq}`}>
          {actual.nota}
        </span>
        <span className={s.ejemplo}>Pantallas con datos de ejemplo</span>
      </div>
    </div>
  );
}
