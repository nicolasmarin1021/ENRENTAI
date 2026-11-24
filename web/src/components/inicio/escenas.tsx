import { Simbolo } from "@/components/brand";
import { d, Ico, ICONOS, v } from "./piezas";
import s from "./inicio.module.css";

// Las cuatro pantallas de la demo de la portada (demo-pasos.tsx), con datos de ejemplo.
// Todo se anima con CSS: cada pieza entra con su retraso (--d). El estado final, sin animación,
// es la pantalla completa (así se ve con «reducir movimiento»).

const BUSQUEDA = "Shure ULXD4";

function Cabecera({ titulo }: { titulo: string }) {
  return (
    <div className={s.appCab}>
      <b>{titulo}</b>
      <Simbolo size={30} />
    </div>
  );
}

function Fila({ n, nombre, cat, ico, t }: { n: number; nombre: string; cat: string; ico: string; t: number }) {
  return (
    <div className={`${s.fila} ${s.izq}`} style={d(t)}>
      <span className={s.filaIco}>
        <Ico d={ico} size={17} />
      </span>
      <span className={s.filaTxt}>
        <b>{nombre}</b>
        <small>{cat}</small>
      </span>
      <span className={s.cant}>
        <i>−</i>
        <span className={s.cuenta} style={v({ "--n": n, "--d": `${t + 0.15}s` })} />
        <i>+</i>
      </span>
    </div>
  );
}

// 1 · Arma tu rider: busca, toca la sugerencia y el rider se va llenando.
export function EscenaRider() {
  return (
    <div className={s.app}>
      <Cabecera titulo="Buscar equipos" />
      <div className={s.seg}>
        <span className={s.on}>Buscar equipos</span>
        <span>Explorar</span>
      </div>
      <div className={`${s.campo} ${s.ap}`} style={d(0.15)}>
        <Ico d={ICONOS.lupa} size={16} />
        <span className={s.letras}>
          {BUSQUEDA.split("").map((c, i) => (
            <span key={i} style={v({ "--i": i })}>
              {c}
            </span>
          ))}
        </span>
        <i className={s.caret} />
        <div className={s.sugerencias} style={d(1.35)}>
          <div className={`${s.sug} ${s.toca}`} style={v({ "--d2": "1.9s" })}>
            <b>Shure ULXD4</b>
            <span>Micrófonos inalámbricos · 4 compañías</span>
          </div>
          <div className={s.sug}>
            <b>Shure ULXD4Q</b>
            <span>Micrófonos inalámbricos</span>
          </div>
        </div>
      </div>
      <div className={`${s.tarjetaApp} ${s.ap}`} style={d(2.4)}>
        <div className={s.filaCab}>
          <b>Tu rider</b>
          <span>16 equipos</span>
        </div>
        <Fila t={2.5} n={8} nombre="Shure ULXD4" cat="Micrófonos inalámbricos" ico={ICONOS.mic} />
        <Fila t={3.2} n={6} nombre="Shure PSM1000" cat="In-ear (IEM)" ico={ICONOS.iem} />
        <Fila t={3.7} n={2} nombre="Antena helicoidal" cat="Antenas y distribución" ico={ICONOS.antena} />
      </div>
      <div className={s.chips}>
        <span className={`${s.chip} ${s.pop}`} style={d(4.3)}>
          <Ico d={ICONOS.calendario} size={14} />
          sáb 13 – dom 14 dic
        </span>
        <span className={`${s.chip} ${s.pop}`} style={d(4.55)}>
          <Ico d={ICONOS.pin} size={14} />
          Laureles
        </span>
      </div>
      <div className={`${s.botonApp} ${s.late}`} style={d(5)}>
        Ver compañías con equipo libre
      </div>
    </div>
  );
}

// 2 · Mira quién lo tiene libre: el mapa con las referencias y la hoja con la compañía.
export function EscenaMapa() {
  return (
    <div className={`${s.app} ${s.appMapa}`}>
      <div className={s.mapa}>
        <svg viewBox="0 0 280 560" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <rect width="280" height="560" fill="#EDF0F6" />
          {/* montañas del valle a lado y lado */}
          <path d="M0 0h64c-10 50 14 90 2 150s-30 90-18 150 22 100 6 160-10 70-4 100H0z" fill="#E2E7F1" />
          <path d="M0 0h36c-6 50 8 90 0 150s-18 90-10 150 12 100 2 160-4 70 0 100H0z" fill="#D8DEEB" />
          <path d="M280 0h-56c14 40-10 90 4 150s30 80 18 150-24 110-10 160 8 70 4 100h40z" fill="#E2E7F1" />
          <path d="M280 0h-30c8 46-6 90 4 150s18 80 10 150-14 110-4 160 4 70 2 100h18z" fill="#D8DEEB" />
          {/* calles */}
          <g stroke="#FFFFFF" strokeWidth="3.5" fill="none" strokeLinecap="round">
            <path d="M60 90 L235 115" />
            <path d="M55 215 L240 195" />
            <path d="M65 330 L230 345" />
            <path d="M60 450 L225 430" />
            <path d="M118 0 L100 560" />
            <path d="M188 0 L172 560" />
          </g>
          <circle cx="212" cy="270" r="18" fill="#DCEBDF" />
          <circle cx="88" cy="150" r="13" fill="#DCEBDF" />
          <circle cx="150" cy="400" r="15" fill="#DCEBDF" />
          {/* el río Medellín cruza el valle de sur a norte */}
          <path className={s.rio} pathLength={100} d="M92 560 C110 480 128 440 136 380 S146 260 160 200 S196 70 204 0" />
        </svg>
        <div className={`${s.mapaChip} ${s.ap}`} style={d(0.1)}>
          <Ico d={ICONOS.calendario} size={14} />
          <span>sáb 13 – dom 14 dic · Laureles</span>
        </div>
        <span className={s.lugar} style={{ left: "46%", top: "40%" }}>
          <small>Tu show</small>
        </span>
        <span className={s.pin} style={v({ left: "27%", top: "23%", "--d": "0.7s" })}>
          Shure ULXD4
        </span>
        <span className={`${s.pin} ${s.equiv}`} style={v({ left: "71%", top: "31%", "--d": "1.1s" })}>
          ≈ Sennheiser EW-DX
        </span>
        <span className={s.pin} style={v({ left: "68%", top: "57%", "--d": "1.5s" })}>
          Shure ULXD4
        </span>
      </div>
      <div className={s.hoja} style={d(2.2)}>
        <span className={s.agarre} />
        <b className={s.hojaTit}>3 compañías con equipo libre</b>
        <div className={s.compania}>
          <span className={s.avatar}>SA</span>
          <span>
            <b>
              Sonido Andino
              <span className={s.verif}>
                <Ico d={ICONOS.check} size={10} grueso={3} />
              </span>
            </b>
            <small>★ 4,9 · a 2,4 km · Libre en tus fechas</small>
          </span>
          <span className={s.corazon} style={d(3.9)}>
            <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden="true">
              <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z" />
            </svg>
          </span>
        </div>
        <div className={s.refs}>
          <span className={`${s.ref} ${s.pop}`} style={d(2.9)}>
            Shure ULXD4 ×8
          </span>
          <span className={`${s.ref} ${s.pop}`} style={d(3.05)}>
            Shure PSM1000 ×6
          </span>
          <span className={`${s.ref} ${s.refEq} ${s.pop}`} style={d(3.2)}>
            ≈ Antena helicoidal ×2
          </span>
        </div>
        <div className={`${s.botonApp} ${s.botonWa} ${s.late}`} style={d(4.6)}>
          <Ico d={ICONOS.chat} size={15} />
          Cotizar por WhatsApp
        </div>
      </div>
    </div>
  );
}

// 3 · Cotiza por WhatsApp: el mensaje sale ya escrito y la compañía responde.
export function EscenaWhatsApp() {
  return (
    <div className={s.wa}>
      <div className={s.waCab}>
        <span className={s.waAtras}>‹</span>
        <span className={s.waAvatar}>SA</span>
        <span>
          <b>Sonido Andino</b>
          <small>en línea</small>
        </span>
      </div>
      <div className={s.waChat}>
        <span className={s.waFecha}>Hoy</span>
        <div className={`${s.burbuja} ${s.mia} ${s.ap}`} style={d(0.5)}>
          {"Hola Sonido Andino, vi su equipo en ENRENTA (solicitud ENR-4821).\nLo necesito del sáb 13 al dom 14 dic, con entrega y recogida en Laureles:\n• 8× Shure ULXD4\n• 6× Shure PSM1000\n• 2× Antena helicoidal\n¿Está disponible?"}
          <span className={s.hora}>
            10:24
            <span className={s.checks} style={d(1.7)}>
              ✓✓
            </span>
          </span>
        </div>
        <div className={s.waRespuesta}>
          <span className={s.escribiendo} style={d(2.3)}>
            <i />
            <i />
            <i />
          </span>
          <div className={`${s.burbuja} ${s.suya} ${s.ap}`} style={d(3.6)}>
            ¡Hola! Sí, lo tenemos libre ese fin de semana 🙌
            <span className={s.hora}>10:26</span>
          </div>
        </div>
        <div className={`${s.burbuja} ${s.suya} ${s.ap}`} style={d(4.5)}>
          Te paso el valor con transporte y técnico.
          <span className={s.hora}>10:26</span>
        </div>
      </div>
      <div className={s.waBarra}>
        <span className={s.waCampo}>Mensaje</span>
        <span className={s.waMic}>
          <Ico d={ICONOS.mic} size={15} grueso={2} />
        </span>
      </div>
    </div>
  );
}

// 4 · Queda apartado: la solicitud pasa a rentada, se aparta en la agenda y sale el PDF.
export function EscenaApartado() {
  return (
    <div className={s.app}>
      <Cabecera titulo="Mis solicitudes" />
      <span className={s.grupo}>Hoy</span>
      <div className={`${s.tarjetaApp} ${s.ap}`} style={d(0.15)}>
        <div className={s.compania}>
          <span className={s.avatar}>SA</span>
          <span>
            <b>Sonido Andino</b>
            <small>sáb 13 – dom 14 dic · 16 equipos</small>
          </span>
          <span className={s.estadoTag}>
            <span className={s.enviada}>Cotizando</span>
            <span className={`${s.rentada} ${s.pop}`} style={d(2.6)}>
              Rentada
            </span>
          </span>
        </div>
        <div className={s.track}>
          <i className={s.trackFill} />
          <span className={s.hito}>
            <i style={d(0.5)} />
            Enviada
          </span>
          <span className={s.hito}>
            <i style={d(1.5)} />
            Cotizada
          </span>
          <span className={s.hito}>
            <i style={d(2.5)} />
            Rentada
          </span>
        </div>
      </div>
      <div className={s.sello} style={d(2.9)}>
        Apartado para ti
      </div>
      <div className={`${s.semana} ${s.ap}`} style={d(3.5)}>
        {[
          ["vie", 12],
          ["sáb", 13],
          ["dom", 14],
          ["lun", 15],
          ["mar", 16],
        ].map(([dia, n]) => (
          <span key={n} className={n === 13 || n === 14 ? `${s.dia} ${s.ocupado}` : s.dia} style={d(3.8)}>
            {dia}
            <b>{n}</b>
          </span>
        ))}
      </div>
      <div className={`${s.acciones} ${s.ap}`} style={d(4.4)}>
        <span className={s.botonSec}>
          <span className={s.baja}>
            <Ico d={ICONOS.baja} size={15} grueso={2} />
          </span>
          Cotización PDF
        </span>
        <span className={s.botonSec}>
          <Ico d={ICONOS.estrella} size={15} grueso={2} />
          Calificar
        </span>
      </div>
    </div>
  );
}
