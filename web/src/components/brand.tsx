// Marca de ENRENTA (dirección «Conector»): la R es un cable que rodea un conector XLR
// y, en el logo completo, sigue por debajo de «ENTA» hasta un plug.
// Los mismos dibujos, listos para descargar, están en /public/marca.

// Recorrido del cable de la R: el aro alrededor del conector y el palo doblado en U.
const ARO_Y_PALO = "M5.1 26 A26.9 26.9 0 1 1 58.9 26 A26.9 26.9 0 1 1 5.1 26 M5.1 26 V91.5 A4.2 4.2 0 0 0 13.5 91.5 V45";
// Pata que se vuelve cable bajo «ENTA» (logo) o que termina en la base (símbolo).
const PATA_CABLE = " M49.3 46.6 L64 88 Q73.9 116 90 116 H318";
const PATA_CORTA = " M49.3 46.6 L66.5 95.1";

// Letras E N · E N T A dibujadas a medida (la R va aparte).
function Letras() {
  return (
    <g className="l-letras">
      <rect x="0" y="0" width="13" height="100" />
      <rect x="0" y="0" width="54" height="13" />
      <rect x="0" y="43.5" width="48" height="13" />
      <rect x="0" y="87" width="54" height="13" />
      <rect x="66" y="0" width="13" height="100" />
      <rect x="119" y="0" width="13" height="100" />
      <polygon points="66,0 81,0 132,100 117,100" />
      <rect x="228" y="0" width="13" height="100" />
      <rect x="228" y="0" width="54" height="13" />
      <rect x="228" y="43.5" width="48" height="13" />
      <rect x="228" y="87" width="54" height="13" />
      <rect x="294" y="0" width="13" height="100" />
      <rect x="347" y="0" width="13" height="100" />
      <polygon points="294,0 309,0 360,100 345,100" />
      <rect x="372" y="0" width="62" height="13" />
      <rect x="396.5" y="0" width="13" height="100" />
      <polygon points="432,100 446.5,100 476.5,0 462,0" />
      <polygon points="461.5,0 476,0 506,100 491.5,100" />
      <rect x="452" y="62" width="34" height="13" />
    </g>
  );
}

// Logo completo en versión simple (sin contornos), pensado para tamaños de encabezado.
// Toma los colores del tema: letras y conector en tinta, cable en el acento.
export function Logo({ className = "" }: { className?: string }) {
  return (
    <svg className={`logo ${className}`} viewBox="-2 -16 518 144" aria-hidden="true" focusable="false">
      <Letras />
      <g transform="translate(144 0)">
        <path className="l-cable" d={ARO_Y_PALO + PATA_CABLE} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
        <circle className="l-cara" cx="32" cy="26" r="21.5" />
        <circle className="l-hueco" cx="24.5" cy="21.8" r="3.6" />
        <circle className="l-hueco" cx="39.5" cy="21.8" r="3.6" />
        <circle className="l-hueco" cx="32" cy="35.2" r="3.6" />
        <polygon className="l-cara" points="312,111.5 326,109.5 326,122.5 312,120.5" />
        <rect className="l-cara" x="326" y="107.5" width="28" height="17" rx="3.5" />
        <rect className="l-funda" x="354" y="109" width="15" height="14" rx="2" />
      </g>
    </svg>
  );
}

// Símbolo: la R sola, con todos sus detalles (contorno, conector y seguro).
export function Simbolo({ size = 64, className = "" }: { size?: number; className?: string }) {
  return (
    <svg className={`simbolo ${className}`} viewBox="-29 -18 124 124" width={size} height={size} aria-hidden="true" focusable="false">
      <path d={ARO_Y_PALO + PATA_CORTA} fill="none" stroke="#1E2230" strokeWidth={9.8} strokeLinecap="round" strokeLinejoin="round" />
      <path className="l-cable" d={ARO_Y_PALO + PATA_CORTA} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="32" cy="26" r="22" fill="#4A4D57" stroke="#1E2230" strokeWidth={1.4} />
      <circle cx="32" cy="26" r="18.5" fill="none" stroke="#3B3E47" strokeWidth={1.2} />
      <circle cx="24.5" cy="21.8" r="3.3" fill="#121318" />
      <circle cx="39.5" cy="21.8" r="3.3" fill="#121318" />
      <circle cx="32" cy="35.2" r="3.3" fill="#121318" />
      <rect x="22.5" y="-13" width="19" height="11.5" rx="3" fill="#C9CCD3" stroke="#1E2230" strokeWidth={1.4} />
      <rect x="27.5" y="-9.5" width="9" height="3" rx="1.2" fill="#8A8F9A" />
    </svg>
  );
}
