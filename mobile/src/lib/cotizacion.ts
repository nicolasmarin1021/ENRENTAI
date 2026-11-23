import { Directory, File, Paths } from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import { conPuntos, fechaLargaCO, numeroCotizacionCO } from "./formato";
import type { ReservaFila } from "./reservas";

// Cotización en PDF (la misma de la web): se arma con los datos del pedido o de una solicitud y se
// guarda o comparte desde el celular. Precio de referencia: ENRENTA no cobra ni recibe pagos.

export type DatosCotizacion = {
  numero?: string; // si falta, se genera uno (COT-fecha-n.º)
  cliente: string;
  compania: { nombre: string; zona?: string | null; direccionBodega?: string | null; horario?: string | null };
  evento: {
    lugar: string;
    direccion?: string | null;
    entrega: string; // ISO
    recogida: string; // ISO
    dias: number;
    modalidad: "entrega" | "retiro";
    distanciaKm?: number | null;
  };
  items: { nombre: string; cantidad: number; precioDia: number }[];
  tecnico?: { nombre: string; valor: number } | null;
  cobro: { alquiler: number; transporte: number; tecnico: number };
};

const DIA = 24 * 60 * 60 * 1000;
const LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -16 518 144" height="34" role="img" aria-label="ENRENTA"><g fill="#1E2230"><rect x="0" y="0" width="13" height="100"/><rect x="0" y="0" width="54" height="13"/><rect x="0" y="43.5" width="48" height="13"/><rect x="0" y="87" width="54" height="13"/><rect x="66" y="0" width="13" height="100"/><rect x="119" y="0" width="13" height="100"/><polygon points="66,0 81,0 132,100 117,100"/><rect x="228" y="0" width="13" height="100"/><rect x="228" y="0" width="54" height="13"/><rect x="228" y="43.5" width="48" height="13"/><rect x="228" y="87" width="54" height="13"/><rect x="294" y="0" width="13" height="100"/><rect x="347" y="0" width="13" height="100"/><polygon points="294,0 309,0 360,100 345,100"/><rect x="372" y="0" width="62" height="13"/><rect x="396.5" y="0" width="13" height="100"/><polygon points="432,100 446.5,100 476.5,0 462,0"/><polygon points="461.5,0 476,0 506,100 491.5,100"/><rect x="452" y="62" width="34" height="13"/></g><g transform="translate(144 0)"><path d="M5.1 26 A26.9 26.9 0 1 1 58.9 26 A26.9 26.9 0 1 1 5.1 26 M5.1 26 V91.5 A4.2 4.2 0 0 0 13.5 91.5 V45 M49.3 46.6 L64 88 Q73.9 116 90 116 H318" fill="none" stroke="#1E2230" stroke-width="9.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.1 26 A26.9 26.9 0 1 1 58.9 26 A26.9 26.9 0 1 1 5.1 26 M5.1 26 V91.5 A4.2 4.2 0 0 0 13.5 91.5 V45 M49.3 46.6 L64 88 Q73.9 116 90 116 H318" fill="none" stroke="#3B5BDB" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="32" cy="26" r="22" fill="#4A4D57" stroke="#1E2230" stroke-width="1.4"/><circle cx="32" cy="26" r="18.5" fill="none" stroke="#3B3E47" stroke-width="1.2"/><circle cx="24.5" cy="21.8" r="3.3" fill="#121318"/><circle cx="39.5" cy="21.8" r="3.3" fill="#121318"/><circle cx="32" cy="35.2" r="3.3" fill="#121318"/><rect x="22.5" y="-13" width="19" height="11.5" rx="3" fill="#C9CCD3" stroke="#1E2230" stroke-width="1.4"/><rect x="27.5" y="-9.5" width="9" height="3" rx="1.2" fill="#8A8F9A"/><polygon points="312,111.1 326,109.5 326,122.5 312,120.9" fill="#2A2C33" stroke="#1E2230" stroke-width="1.2" stroke-linejoin="round"/><rect x="326" y="107.5" width="28" height="17" rx="3.5" fill="#2A2C33" stroke="#1E2230" stroke-width="1.2"/><path d="M332 112 L335 116 L338 112" fill="none" stroke="#8A8F9A" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><rect x="354" y="109" width="12" height="14" rx="2" fill="#C9CCD3" stroke="#1E2230" stroke-width="1.2"/><rect x="358" y="114.5" width="5.5" height="3" rx="1" fill="#6B6F7A"/><rect x="366" y="111.5" width="3" height="9" rx="1" fill="#9EA3AD" stroke="#1E2230" stroke-width="1"/></g></svg>`;
const cop = (n: number) => `$ ${conPuntos(Math.round(n))}`;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const diasTxt = (n: number) => `${n} ${n === 1 ? "día" : "días"}`;

// Los datos de una solicitud ya enviada (así el documento queda en Mis solicitudes y en el Panel).
export function cotizacionDeSolicitud(r: ReservaFila): DatosCotizacion {
  return {
    numero: r.codigo,
    cliente: r.cliente_nombre,
    compania: {
      nombre: r.companias?.nombre ?? "",
      zona: r.companias?.zona,
      direccionBodega: r.companias?.direccion_bodega,
      horario: r.companias?.horario_bodega,
    },
    evento: {
      lugar: r.lugar_nombre,
      direccion: r.lugar_direccion,
      entrega: r.entrega,
      recogida: r.recogida,
      dias: r.dias,
      modalidad: r.modalidad,
      distanciaKm: r.distancia_km === null ? null : Number(r.distancia_km),
    },
    items: r.reserva_items.map((i) => ({ nombre: i.nombre, cantidad: i.cantidad, precioDia: i.precio_dia })),
    tecnico: r.con_tecnico ? { nombre: "Técnico", valor: Number(r.tecnico) } : null,
    cobro: { alquiler: Number(r.alquiler), transporte: Number(r.transporte), tecnico: Number(r.tecnico) },
  };
}

export function htmlCotizacion(d: DatosCotizacion, emitido = new Date()): string {
  const numero = d.numero ?? numeroCotizacionCO(emitido);
  const e = d.evento;
  const c = d.cobro;
  const km = e.distanciaKm != null ? ` (${String(Math.round(e.distanciaKm * 10) / 10).replace(".", ",")} km de la bodega)` : "";
  const logistica =
    e.modalidad === "entrega"
      ? `Entrega y recogida en el lugar${km}`
      : `El cliente recoge y devuelve en la bodega${d.compania.direccionBodega ? `: ${d.compania.direccionBodega}` : ""}${d.compania.horario ? ` (${d.compania.horario})` : ""}`;
  const filas = [
    ...d.items.map((i) => ({ n: i.nombre, q: i.cantidad, p: i.precioDia, s: i.precioDia * i.cantidad * e.dias })),
    ...(d.tecnico && d.tecnico.valor > 0 ? [{ n: `${d.tecnico.nombre} (técnico)`, q: 1, p: d.tecnico.valor / e.dias, s: d.tecnico.valor }] : []),
  ];
  const totales = [
    { k: `Alquiler (${diasTxt(e.dias)})`, v: cop(c.alquiler) },
    { k: "Transporte (entrega y recogida)", v: e.modalidad === "retiro" ? "Retiro en bodega · $ 0" : cop(c.transporte) },
    ...(c.tecnico > 0 ? [{ k: "Técnico", v: cop(c.tecnico) }] : []),
  ];
  const total = c.alquiler + c.transporte + c.tecnico;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  @page { margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Helvetica, Arial, sans-serif; color: #1E2230; font-size: 12px; line-height: 1.35; }
  .barra { height: 5px; background: #3B5BDB; }
  .pagina { padding: 28px 40px 40px; }
  .cabeza { display: flex; justify-content: space-between; align-items: flex-start; }
  .cabeza .sub { color: #5A6072; font-size: 11px; margin-top: 8px; }
  .der { text-align: right; }
  .titulo { color: #3B5BDB; font-weight: 700; font-size: 15px; }
  .num { font-weight: 700; font-size: 12.5px; margin-top: 4px; }
  .fino { color: #5A6072; font-size: 10.5px; margin-top: 3px; }
  .partes { display: flex; gap: 12px; margin-top: 22px; }
  .caja { flex: 1; background: #F3F5FB; border-radius: 8px; padding: 12px 14px; min-height: 70px; }
  .caja small { display: block; font-size: 9px; font-weight: 700; letter-spacing: .6px; color: #5A6072; margin-bottom: 6px; }
  .caja b { font-size: 13px; }
  .caja div { color: #5A6072; font-size: 10.5px; margin-top: 3px; }
  h4 { font-size: 9px; letter-spacing: .6px; color: #5A6072; margin: 20px 0 8px; }
  .ev { display: flex; padding: 3px 0; font-size: 11.5px; }
  .ev span:first-child { width: 120px; color: #5A6072; flex: none; }
  table { width: 100%; border-collapse: collapse; margin-top: 18px; }
  th { background: #1E2230; color: #fff; font-size: 10.5px; padding: 8px 10px; text-align: right; }
  th:first-child, td:first-child { text-align: left; }
  th:first-child { border-radius: 6px 0 0 6px; }
  th:last-child { border-radius: 0 6px 6px 0; }
  td { padding: 8px 10px; text-align: right; font-size: 11.5px; }
  tr:nth-child(even) td { background: #F3F5FB; }
  td:last-child { font-weight: 700; }
  tr { page-break-inside: avoid; }
  .linea { border-top: 1px solid #D9DDE8; margin-top: 4px; }
  .totales { width: 60%; margin-left: auto; margin-top: 16px; page-break-inside: avoid; }
  .tot { display: flex; justify-content: space-between; padding: 4px 0; color: #5A6072; font-size: 12px; }
  .tot b { color: #1E2230; }
  .fuerte { border-top: 1px solid #D9DDE8; margin-top: 6px; padding-top: 10px; font-size: 14px; color: #1E2230; font-weight: 700; }
  .fuerte b { color: #3B5BDB; font-size: 15px; }
  .notas { background: #F3F5FB; border-radius: 8px; padding: 12px 16px; margin-top: 22px; color: #5A6072; font-size: 10.5px; page-break-inside: avoid; }
  .notas p { margin: 0 0 6px; }
  .notas p:last-child { margin: 0; }
  .pie { border-top: 1px solid #D9DDE8; margin-top: 26px; padding-top: 8px; color: #5A6072; font-size: 9.5px; }
</style></head><body>
<div class="barra"></div>
<div class="pagina">
  <div class="cabeza">
    <div>${LOGO}<div class="sub">Renta de audio y RF · Medellín</div></div>
    <div class="der">
      <div class="titulo">COTIZACIÓN</div>
      <div class="num">N.º ${esc(numero)}</div>
      <div class="fino">Emitido: ${esc(fechaLargaCO(emitido))}</div>
      <div class="fino">Válida hasta: ${esc(fechaLargaCO(new Date(+emitido + 3 * DIA)))}</div>
    </div>
  </div>
  <div class="partes">
    <div class="caja"><small>CLIENTE</small><b>${esc(d.cliente || "Por confirmar")}</b></div>
    <div class="caja"><small>COMPAÑÍA</small><b>${esc(d.compania.nombre)}</b>${d.compania.zona ? `<div>Bodega en ${esc(d.compania.zona)}</div>` : ""}</div>
  </div>
  <h4>EVENTO</h4>
  <div class="ev"><span>Lugar</span><span>${esc(e.lugar + (e.direccion ? ` · ${e.direccion}` : ""))}</span></div>
  <div class="ev"><span>Entrega</span><span>${esc(fechaLargaCO(e.entrega))}</span></div>
  <div class="ev"><span>Recogida</span><span>${esc(fechaLargaCO(e.recogida))}</span></div>
  <div class="ev"><span>Días cobrados</span><span>${esc(diasTxt(e.dias))} (uno por cada 24 horas)</span></div>
  <div class="ev"><span>Logística</span><span>${esc(logistica)}</span></div>
  <table>
    <tr><th>Equipo</th><th>Cant.</th><th>Precio / 24 h</th><th>Días</th><th>Subtotal</th></tr>
    ${filas.map((f) => `<tr><td>${esc(f.n)}</td><td>${f.q}</td><td>${cop(f.p)}</td><td>${e.dias}</td><td>${cop(f.s)}</td></tr>`).join("")}
  </table>
  <div class="linea"></div>
  <div class="totales">
    ${totales.map((t) => `<div class="tot"><span>${esc(t.k)}</span><b>${esc(t.v)}</b></div>`).join("")}
    <div class="tot fuerte"><span>TOTAL DE REFERENCIA</span><b>${cop(total)}</b></div>
  </div>
  <div class="notas">
    <p>•  Cotización de referencia generada en ENRENTA (BETA). El valor final y la forma de pago se acuerdan directamente con la compañía; ENRENTA no cobra ni recibe pagos.</p>
    <p>•  Los precios los define la compañía. Se cuenta un día por cada 24 horas entre la entrega y la recogida.</p>
    <p>•  El equipo queda apartado cuando la compañía marca la solicitud como rentada.</p>
  </div>
  <div class="pie">ENRENTA · Medellín, Colombia</div>
</div>
</body></html>`;
}

// Genera el PDF y abre el menú para guardarlo o enviarlo. Devuelve un mensaje si algo falla ("" = bien).
export async function compartirCotizacion(d: DatosCotizacion): Promise<string> {
  try {
    const emitido = new Date();
    const numero = d.numero ?? numeroCotizacionCO(emitido);
    const html = htmlCotizacion({ ...d, numero }, emitido);
    if (Platform.OS === "web") {
      await Print.printAsync({ html });
      return "";
    }
    const { uri } = await Print.printToFileAsync({ html, width: 612, height: 792 });
    // Con un nombre claro (ENRENTA-Cotizacion-EN-ABCD.pdf), en una carpeta nueva cada vez para que
    // iOS nunca choque con un archivo anterior. Si algo falla, se comparte el archivo original.
    const opciones = { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: "Cotización ENRENTA" };
    let ruta = "";
    try {
      const carpeta = new Directory(Paths.cache, `cotizacion-${Date.now()}`);
      carpeta.create();
      const nuevo = new File(carpeta, `ENRENTA-Cotizacion-${numero.replace(/[^\w-]/g, "")}.pdf`);
      new File(uri).copy(nuevo);
      ruta = nuevo.uri;
    } catch {
      ruta = "";
    }
    try {
      await Sharing.shareAsync(ruta || uri, opciones);
    } catch (err) {
      if (!ruta) throw err;
      await Sharing.shareAsync(uri, opciones);
    }
    return "";
  } catch (e) {
    const detalle = e instanceof Error ? e.message : String(e);
    console.warn("Cotización PDF:", detalle);
    return "No pudimos generar el PDF. Intenta de nuevo.";
  }
}
