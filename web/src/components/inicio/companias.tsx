import Link from "next/link";
import { d, Ico, ICONOS, v } from "./piezas";
import s from "./inicio.module.css";

// Portada · sección para las compañías: cuatro tarjetas con pequeñas animaciones en bucle
// (solo CSS) de lo que hace ENRENTA por ellas. Datos de ejemplo.

const SOLICITUDES = [
  { quien: "FE", que: "8× Shure ULXD4 · 2× antenas", donde: "Festival · Envigado · sáb 13 dic" },
  { quien: "CL", que: "6× Shure PSM1000", donde: "Concierto · Laureles · vie 19 dic" },
  { quien: "BP", que: "4× Sennheiser EW-DX", donde: "Boda · El Poblado · sáb 27 dic" },
];

// Diciembre de 2026 empieza en martes (semana de lunes a domingo).
const RENTADOS = [5, 6, 12, 13, 14, 19, 20, 26, 27];
const BLOQUEADOS = [24, 25, 31];

export function Companias() {
  return (
    <section className={s.seccion} aria-labelledby="inicio-companias">
      <header className={`${s.cabeza} ${s.revela}`}>
        <span className={s.ceja}>Si tienes equipos</span>
        <h2 id="inicio-companias" className={s.h2}>
          Tu bodega, abierta a <span className="hl">toda Medellín</span>
        </h2>
        <p>Publica tu inventario una vez. ENRENTA se lo muestra a quien lo busca en las fechas que tienes libres.</p>
      </header>

      <div className={s.bento}>
        <article className={`${s.celda} ${s.ancha} ${s.revela}`}>
          <div className={s.celdaTxt}>
            <h3>Solicitudes con todo el detalle</h3>
            <p>Cada pedido te llega con el rider, las fechas y el lugar del show. Respondes por WhatsApp.</p>
          </div>
          <div className={s.feed} aria-hidden="true">
            <div className={s.riel}>
              {[...SOLICITUDES, ...SOLICITUDES].map((x, i) => (
                <div key={i} className={s.aviso}>
                  <span className={s.avisoIco}>
                    <Ico d={ICONOS.chat} size={17} />
                  </span>
                  <span className={s.filaTxt}>
                    <b>{x.que}</b>
                    <small>{x.donde}</small>
                  </span>
                  <span className={s.nueva}>Nueva</span>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className={`${s.celda} ${s.revela}`}>
          <div className={s.celdaTxt}>
            <h3>Tu agenda, siempre al día</h3>
            <p>Lo que marcas como rentado o bloqueado deja de aparecer como libre en esas fechas.</p>
          </div>
          <div className={s.calCaja} aria-hidden="true">
            <div className={s.calCab}>
              <b>Diciembre 2026</b>
              <span>
                <i className={s.lRentado} /> Rentado <i className={s.lBloqueado} /> Bloqueado
              </span>
            </div>
            <div className={s.cal}>
              {["L", "M", "M", "J", "V", "S", "D"].map((x, i) => (
                <span key={`d${i}`} className={s.calDia}>
                  {x}
                </span>
              ))}
              <span />
              {Array.from({ length: 31 }, (_, i) => i + 1).map((n) => {
                const r = RENTADOS.indexOf(n);
                const cls = r >= 0 ? s.r : BLOQUEADOS.includes(n) ? s.b : undefined;
                return (
                  <span key={n} className={cls} style={r >= 0 ? d(r * 0.32) : undefined}>
                    {n}
                  </span>
                );
              })}
            </div>
          </div>
        </article>

        <article className={`${s.celda} ${s.revela}`}>
          <div className={s.celdaTxt}>
            <h3>Preguntas antes de cotizar</h3>
            <p>Los clientes te escriben por el chat de ENRENTA y resuelves sus dudas antes de que pidan la cotización.</p>
          </div>
          <div className={s.chatMini} aria-hidden="true">
            <span className={s.chatCab}>
              <Ico d={ICONOS.chat} size={14} /> Pregunta sobre Shure ULXD4
            </span>
            <span className={s.cq}>¿Los micrófonos traen baterías recargables?</span>
            <span className={s.caCaja}>
              <span className={s.cdots}>
                <i />
                <i />
                <i />
              </span>
              <span className={s.ca}>Sí, cada uno con dos baterías y su cargador 🔋</span>
            </span>
          </div>
        </article>

        <article className={`${s.celda} ${s.ancha} ${s.revela}`}>
          <div className={s.celdaTxt}>
            <h3>Verificada y bien calificada</h3>
            <p>La verificación de identidad y las calificaciones de tus clientes le dan confianza a quien todavía no te conoce.</p>
          </div>
          <div className={s.confianza} aria-hidden="true">
            <span className={s.escudo}>
              <svg viewBox="0 0 24 24" width={40} height={40} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                <path d={ICONOS.escudo} />
                <path className={s.chulo} pathLength={20} d="M9 12l2.2 2.2L15.5 10" />
              </svg>
            </span>
            <span className={s.nota2}>
              <span className={s.tagOk}>
                <Ico d={ICONOS.check} size={12} grueso={3} /> Compañía verificada
              </span>
              <span className={s.estrellas}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <svg key={i} viewBox="0 0 24 24" style={v({ "--d": `${i * 0.14}s` })}>
                    <path d={ICONOS.estrella} />
                  </svg>
                ))}
                <b>4,9</b>
              </span>
              <small>Calificaciones de clientes que ya rentaron</small>
            </span>
          </div>
        </article>
      </div>

      <div className={`${s.pieSeccion} ${s.revela}`}>
        <Link href="/tengo" className="btn primary lg">
          Publicar mi inventario
        </Link>
        <span className={s.ejemploPie}>Tarjetas con datos de ejemplo</span>
      </div>
    </section>
  );
}
