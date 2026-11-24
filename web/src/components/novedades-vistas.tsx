import type { ComponentType } from "react";
import { Ico, ICONOS, v } from "./inicio/piezas";
import s from "./novedades.module.css";

// Viñetas animadas de lo que trae ENRENTA completa, para el anuncio «Lo que viene»
// (components/novedades.tsx). Cada una repite en bucle, con CSS, lo que hará esa novedad,
// con el mismo estilo de las demos de la portada. Datos de ejemplo.

const CANDADO = "M6 11h12v9H6z";
const ARCO = "M8.5 11V8a3.5 3.5 0 0 1 7 0v3";
const CAMPANA = "M6.5 16v-5a5.5 5.5 0 0 1 11 0v5l1.5 2h-14zM10 20.5a2 2 0 0 0 4 0";
const CAMARA = "M4 8.5h3.2l1.8-2.5h6l1.8 2.5H20V19H4zM12 16.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6z";
const AUDIFONOS = "M4.5 13a7.5 7.5 0 0 1 15 0M4.5 13v3.5A1.5 1.5 0 0 0 6 18h1.5v-5.5H6M19.5 13v3.5A1.5 1.5 0 0 1 18 18h-1.5v-5.5H18";
const PARLANTE = "M7 4h10v16H7zM12 16a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2zM12 7.6h.01";

// Pago protegido: el pago sale de ti, ENRENTA lo guarda y se libera a la compañía.
function VistaPago() {
  return (
    <div className={`${s.vista} ${s.pago}`} aria-hidden="true">
      <i className={s.riel} />
      <span className={`${s.nodo} ${s.nodoTu}`}>Tú</span>
      <span className={s.boveda}>
        <Ico d={ICONOS.escudo} size={20} grueso={1.9} />
      </span>
      <span className={`${s.nodo} ${s.nodoCia}`}>Compañía</span>
      <span className={s.moneda}>$</span>
      <span className={`${s.capas} ${s.pagoEstado}`}>
        <span className={`${s.chip} ${s.e1} ${s.tonoCoral}`}>Pagas en ENRENTA</span>
        <span className={`${s.chip} ${s.e2} ${s.tonoAzul}`}>Protegido</span>
        <span className={`${s.chip} ${s.e3} ${s.tonoOk}`}>Liberado ✓</span>
      </span>
    </div>
  );
}

// Depósito en garantía: guardado durante la renta y devuelto al cerrar.
function VistaDeposito() {
  return (
    <div className={`${s.vista} ${s.deposito}`} aria-hidden="true">
      <div className={s.depFila}>
        <span className={s.candado}>
          <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
            <path d={CANDADO} />
            <path className={s.arco} d={ARCO} />
          </svg>
        </span>
        <span className={s.depTxt}>
          <b>Depósito</b>
          <small>$ 500.000</small>
        </span>
        <span className={s.capas}>
          <span className={`${s.chip} ${s.guardado} ${s.tonoAzul}`}>Guardado</span>
          <span className={`${s.chip} ${s.devuelto} ${s.tonoOk}`}>Devuelto ✓</span>
        </span>
      </div>
      <div className={s.renta}>
        <span>sáb 13</span>
        <span className={s.rentaBarra}>
          <i />
        </span>
        <span>dom 14</span>
      </div>
      <span className={s.mas}>+ $ 500.000</span>
    </div>
  );
}

// Entregas con fotos: cada paso queda con su foto y su chequeo.
function VistaFotos() {
  return (
    <div className={`${s.vista} ${s.fotos}`} aria-hidden="true">
      {["Salida", "Llegada", "Regreso", "Revisión"].map((paso, i) => (
        <span key={paso} className={s.foto} style={v({ "--i": i })}>
          <span className={s.img}>
            <Ico d={PARLANTE} size={18} grueso={1.6} />
            <span className={s.okFoto}>
              <Ico d={ICONOS.check} size={9} grueso={3.4} />
            </span>
          </span>
          {paso}
        </span>
      ))}
    </div>
  );
}

// Casos con respaldo: el caso pasa de abierto a resuelto, con fotos y ENRENTA en medio.
function VistaCaso() {
  return (
    <div className={`${s.vista} ${s.caso}`} aria-hidden="true">
      <div className={s.casoCab}>
        <b>Caso · Faltante</b>
        <span className={s.capas}>
          <span className={`${s.chip} ${s.e1} ${s.tonoMal}`}>Abierto</span>
          <span className={`${s.chip} ${s.e2} ${s.tonoAviso}`}>En revisión</span>
          <span className={`${s.chip} ${s.e3} ${s.tonoOk}`}>Resuelto ✓</span>
        </span>
      </div>
      <div className={s.casoFila}>
        <span className={`${s.chip} ${s.evid}`}>
          <Ico d={CAMARA} size={12} grueso={2} /> 3 fotos
        </span>
        <span className={`${s.chip} ${s.media}`}>
          <Ico d={AUDIFONOS} size={12} grueso={2} /> ENRENTA media
        </span>
      </div>
      <span className={s.casoBarra}>
        <i />
      </span>
    </div>
  );
}

// Chat en ENRENTA: avisos automáticos de cada paso y la conversación con la compañía.
function VistaChat() {
  return (
    <div className={`${s.vista} ${s.chat}`} aria-hidden="true">
      <span className={s.avisoChat}>
        <Ico d={CAMPANA} size={11} grueso={2} /> Tu equipo salió de bodega
      </span>
      <span className={s.msgCia}>Llegamos a las 3:00 p. m.</span>
      <span className={s.msgTu}>¡Perfecto, gracias!</span>
    </div>
  );
}

// Comprobantes y liquidaciones: el documento se arma y sale en PDF.
function VistaPdf() {
  return (
    <div className={`${s.vista} ${s.pdf}`} aria-hidden="true">
      <span className={s.hojas}>
        <span className={`${s.hoja} ${s.hojaAtras}`} />
        <span className={s.hoja}>
          <i className={s.hojaLogo} />
          {[0, 1, 2].map((i) => (
            <i key={i} className={s.lin} style={v({ "--d": `${0.15 + i * 0.18}s` })} />
          ))}
          <i className={`${s.lin} ${s.linTotal}`} style={v({ "--d": "0.7s" })} />
          <span className={s.selloPdf}>PDF</span>
        </span>
      </span>
      <span className={s.descarga}>
        <span className={s.flechaPdf}>
          <Ico d={ICONOS.baja} size={15} grueso={2.2} />
        </span>
      </span>
    </div>
  );
}

// Por título de la novedad (lib/novedades.ts). Si alguna no tiene viñeta, se muestra su ícono.
export const VISTAS: Record<string, ComponentType> = {
  "Pago protegido": VistaPago,
  "Depósito en garantía": VistaDeposito,
  "Entregas con fotos": VistaFotos,
  "Casos con respaldo": VistaCaso,
  "Chat en ENRENTA": VistaChat,
  "Comprobantes y liquidaciones": VistaPdf,
};
