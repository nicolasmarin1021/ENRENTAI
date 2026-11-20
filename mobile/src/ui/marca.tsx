import Svg, { Circle, G, Path, Polygon, Rect } from "react-native-svg";
import { color } from "@/tema";

// Marca de ENRENTA (dirección «Conector»), los mismos dibujos de web/src/components/brand.tsx:
// la R es un cable que rodea un conector XLR y, en el logo completo, sigue bajo «ENTA» hasta un plug.

const ARO_Y_PALO = "M5.1 26 A26.9 26.9 0 1 1 58.9 26 A26.9 26.9 0 1 1 5.1 26 M5.1 26 V91.5 A4.2 4.2 0 0 0 13.5 91.5 V45";
const PATA_CABLE = " M49.3 46.6 L64 88 Q73.9 116 90 116 H318";
const PATA_CORTA = " M49.3 46.6 L66.5 95.1";

function Letras({ tinta }: { tinta: string }) {
  return (
    <G fill={tinta}>
      <Rect x="0" y="0" width="13" height="100" />
      <Rect x="0" y="0" width="54" height="13" />
      <Rect x="0" y="43.5" width="48" height="13" />
      <Rect x="0" y="87" width="54" height="13" />
      <Rect x="66" y="0" width="13" height="100" />
      <Rect x="119" y="0" width="13" height="100" />
      <Polygon points="66,0 81,0 132,100 117,100" />
      <Rect x="228" y="0" width="13" height="100" />
      <Rect x="228" y="0" width="54" height="13" />
      <Rect x="228" y="43.5" width="48" height="13" />
      <Rect x="228" y="87" width="54" height="13" />
      <Rect x="294" y="0" width="13" height="100" />
      <Rect x="347" y="0" width="13" height="100" />
      <Polygon points="294,0 309,0 360,100 345,100" />
      <Rect x="372" y="0" width="62" height="13" />
      <Rect x="396.5" y="0" width="13" height="100" />
      <Polygon points="432,100 446.5,100 476.5,0 462,0" />
      <Polygon points="461.5,0 476,0 506,100 491.5,100" />
      <Rect x="452" y="62" width="34" height="13" />
    </G>
  );
}

// Logo completo (ENRENTA con la R de cable). `alto` es la altura en puntos.
export function Logo({ alto = 26, tinta = color.tinta }: { alto?: number; tinta?: string }) {
  const ancho = (alto * 518) / 144;
  return (
    <Svg width={ancho} height={alto} viewBox="-2 -16 518 144" accessibilityLabel="ENRENTA">
      <Letras tinta={tinta} />
      <G transform="translate(144 0)">
        <Path d={ARO_Y_PALO + PATA_CABLE} fill="none" stroke={color.acento} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx="32" cy="26" r="21.5" fill={tinta} />
        <Circle cx="24.5" cy="21.8" r="3.6" fill={color.superficie} />
        <Circle cx="39.5" cy="21.8" r="3.6" fill={color.superficie} />
        <Circle cx="32" cy="35.2" r="3.6" fill={color.superficie} />
        <Polygon points="312,111.5 326,109.5 326,122.5 312,120.5" fill={tinta} />
        <Rect x="326" y="107.5" width="28" height="17" rx="3.5" fill={tinta} />
        <Rect x="354" y="109" width="15" height="14" rx="2" fill="#9EA3AD" />
      </G>
    </Svg>
  );
}

// Símbolo: la R sola, con todos sus detalles (contorno, conector y seguro).
export function Simbolo({ tam = 64 }: { tam?: number }) {
  return (
    <Svg width={tam} height={tam} viewBox="-29 -18 124 124" accessibilityLabel="ENRENTA">
      <Path d={ARO_Y_PALO + PATA_CORTA} fill="none" stroke="#1E2230" strokeWidth={9.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d={ARO_Y_PALO + PATA_CORTA} fill="none" stroke={color.acento} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="32" cy="26" r="22" fill="#4A4D57" stroke="#1E2230" strokeWidth={1.4} />
      <Circle cx="32" cy="26" r="18.5" fill="none" stroke="#3B3E47" strokeWidth={1.2} />
      <Circle cx="24.5" cy="21.8" r="3.3" fill="#121318" />
      <Circle cx="39.5" cy="21.8" r="3.3" fill="#121318" />
      <Circle cx="32" cy="35.2" r="3.3" fill="#121318" />
      <Rect x="22.5" y="-13" width="19" height="11.5" rx="3" fill="#C9CCD3" stroke="#1E2230" strokeWidth={1.4} />
      <Rect x="27.5" y="-9.5" width="9" height="3" rx="1.2" fill="#8A8F9A" />
    </Svg>
  );
}
