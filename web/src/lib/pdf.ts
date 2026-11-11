// Documentos en PDF de ENRENTA: cotización (antes de reservar), comprobante de
// servicio (cliente) y liquidación (compañía). Se generan en el navegador.
// Este archivo no importa nada de la app para poder probarlo por separado.
import { jsPDF } from "jspdf";

export type TipoDoc = "cotizacion" | "comprobante" | "liquidacion";

export type DatosDoc = {
  tipo: TipoDoc;
  numero: string;
  emitido: string; // ISO
  validoHasta?: string; // ISO, solo cotización
  estado?: string; // texto del estado de la reserva
  cliente: { nombre: string };
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
  cobro: {
    alquiler: number;
    transporte: number;
    tecnico: number;
    servicio: number;
    depositoPct: number;
    deposito: number;
    total: number;
    comision?: number;
  };
};

// Paleta de la marca: azul señal, tinta y grises azulados.
const ACENTO: [number, number, number] = [59, 91, 219];
const TINTA: [number, number, number] = [30, 34, 48];
const SUAVE: [number, number, number] = [90, 96, 114];
const LINEA: [number, number, number] = [217, 221, 232];
const FONDO: [number, number, number] = [243, 245, 251];

// Logo completo en vectores (el mismo dibujo de /public/marca/enrenta-logo.svg).
// x, y: esquina superior izquierda de las letras; alto: alto de las mayúsculas en mm.
function dibujarLogo(doc: jsPDF, x: number, y: number, alto: number) {
  const s = alto / 100;
  const X = (u: number) => x + u * s;
  const Y = (v: number) => y + v * s;
  const R = (u: number) => X(144 + u); // la R empieza en x = 144
  const poligono = (pts: number[], dx = 0) => {
    doc.moveTo(X(dx + pts[0]), Y(pts[1]));
    for (let i = 2; i < pts.length; i += 2) doc.lineTo(X(dx + pts[i]), Y(pts[i + 1]));
    doc.close();
  };

  // Letras E N · E N T A
  doc.setFillColor(...TINTA);
  const rects = [
    [0, 0, 13, 100], [0, 0, 54, 13], [0, 43.5, 48, 13], [0, 87, 54, 13],
    [66, 0, 13, 100], [119, 0, 13, 100],
    [228, 0, 13, 100], [228, 0, 54, 13], [228, 43.5, 48, 13], [228, 87, 54, 13],
    [294, 0, 13, 100], [347, 0, 13, 100],
    [372, 0, 62, 13], [396.5, 0, 13, 100],
    [452, 62, 34, 13],
  ];
  rects.forEach(([a, b, w, h]) => doc.rect(X(a), Y(b), w * s, h * s, "F"));
  [
    [66, 0, 81, 0, 132, 100, 117, 100],
    [294, 0, 309, 0, 360, 100, 345, 100],
    [432, 100, 446.5, 100, 476.5, 0, 462, 0],
    [461.5, 0, 476, 0, 506, 100, 491.5, 100],
  ].forEach((p) => {
    poligono(p);
    doc.fill();
  });

  // La R: un cable (contorno en tinta y relleno azul) que forma el aro, el palo en U y la pata.
  const cable = () => {
    doc.circle(R(32), Y(26), 26.9 * s, "S");
    doc.moveTo(R(5.1), Y(26));
    doc.lineTo(R(5.1), Y(91.5));
    doc.curveTo(R(5.1), Y(93.82), R(6.98), Y(95.7), R(9.3), Y(95.7));
    doc.curveTo(R(11.62), Y(95.7), R(13.5), Y(93.82), R(13.5), Y(91.5));
    doc.lineTo(R(13.5), Y(45));
    doc.stroke();
    doc.moveTo(R(49.3), Y(46.6));
    doc.lineTo(R(64), Y(88));
    doc.curveTo(R(70.6), Y(106.67), R(79.27), Y(116), R(90), Y(116));
    doc.lineTo(R(318), Y(116));
    doc.stroke();
  };
  doc.setLineCap("round");
  doc.setLineJoin("round");
  doc.setDrawColor(...TINTA);
  doc.setLineWidth(9.8 * s);
  cable();
  doc.setDrawColor(...ACENTO);
  doc.setLineWidth(7 * s);
  cable();

  // Conector XLR hembra con su seguro.
  doc.setDrawColor(...TINTA);
  doc.setLineWidth(1.4 * s);
  doc.setFillColor(74, 77, 87);
  doc.circle(R(32), Y(26), 22 * s, "FD");
  doc.setDrawColor(59, 62, 71);
  doc.setLineWidth(1.2 * s);
  doc.circle(R(32), Y(26), 18.5 * s, "S");
  doc.setFillColor(18, 19, 24);
  [[24.5, 21.8], [39.5, 21.8], [32, 35.2]].forEach(([a, b]) => doc.circle(R(a), Y(b), 3.3 * s, "F"));
  doc.setDrawColor(...TINTA);
  doc.setLineWidth(1.4 * s);
  doc.setFillColor(201, 204, 211);
  doc.roundedRect(R(22.5), Y(-13), 19 * s, 11.5 * s, 3 * s, 3 * s, "FD");
  doc.setFillColor(138, 143, 154);
  doc.roundedRect(R(27.5), Y(-9.5), 9 * s, 3 * s, 1.2 * s, 1.2 * s, "F");

  // Plug XLR macho al final del cable.
  doc.setLineWidth(1.2 * s);
  doc.setFillColor(42, 44, 51);
  poligono([312, 111.1, 326, 109.5, 326, 122.5, 312, 120.9], 144);
  doc.fillStroke();
  doc.roundedRect(R(326), Y(107.5), 28 * s, 17 * s, 3.5 * s, 3.5 * s, "FD");
  doc.setDrawColor(138, 143, 154);
  doc.moveTo(R(332), Y(112));
  doc.lineTo(R(335), Y(116));
  doc.lineTo(R(338), Y(112));
  doc.stroke();
  doc.setDrawColor(...TINTA);
  doc.setFillColor(201, 204, 211);
  doc.roundedRect(R(354), Y(109), 12 * s, 14 * s, 2 * s, 2 * s, "FD");
  doc.setFillColor(107, 111, 122);
  doc.roundedRect(R(358), Y(114.5), 5.5 * s, 3 * s, 1 * s, 1 * s, "F");
  doc.setLineWidth(1 * s);
  doc.setFillColor(158, 163, 173);
  doc.roundedRect(R(366), Y(111.5), 3 * s, 9 * s, 1 * s, 1 * s, "FD");

  // Volver a los valores por defecto para el resto del documento.
  doc.setLineCap("butt");
  doc.setLineJoin("miter");
  doc.setLineWidth(0.2);
}

// Las fuentes estándar del PDF no traen espacios especiales: se normalizan.
const limpio = (s: string) => s.replace(/[   ]/g, " ").replace(/→/g, "a");
const cop = (n: number) => "$ " + new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(Math.round(n));
const fecha = (iso: string, conHora = true) =>
  limpio(
    new Intl.DateTimeFormat("es-CO", {
      timeZone: "America/Bogota",
      weekday: conHora ? "short" : undefined,
      day: "numeric",
      month: "short",
      year: "numeric",
      ...(conHora ? { hour: "2-digit", minute: "2-digit", hourCycle: "h23" as const } : {}),
    }).format(new Date(iso)),
  );

const TITULOS: Record<TipoDoc, string> = {
  cotizacion: "COTIZACIÓN",
  comprobante: "COMPROBANTE DE SERVICIO",
  liquidacion: "LIQUIDACIÓN PARA LA COMPAÑÍA",
};

export function nombreArchivo(d: DatosDoc) {
  const base = { cotizacion: "Cotizacion", comprobante: "Comprobante", liquidacion: "Liquidacion" }[d.tipo];
  return `ENRENTA-${base}-${d.numero}.pdf`;
}

export function generarPDF(d: DatosDoc): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 18; // margen
  const ANCHO = W - M * 2;
  let y = 0;

  const texto = (t: string, x: number, yy: number, o: { size?: number; bold?: boolean; color?: [number, number, number]; align?: "left" | "right" | "center"; max?: number } = {}) => {
    doc.setFont("helvetica", o.bold ? "bold" : "normal");
    doc.setFontSize(o.size ?? 10);
    doc.setTextColor(...(o.color ?? TINTA));
    const lineas = o.max ? doc.splitTextToSize(limpio(t), o.max) : limpio(t);
    doc.text(lineas, x, yy, { align: o.align ?? "left" });
    return Array.isArray(lineas) ? lineas.length : 1;
  };
  const nuevaPaginaSiHaceFalta = (alto: number) => {
    if (y + alto > H - 28) {
      doc.addPage();
      y = M;
    }
  };

  // ---- Encabezado ----
  doc.setFillColor(...ACENTO);
  doc.rect(0, 0, W, 4, "F");
  y = 18;
  dibujarLogo(doc, M, 11, 6.4);
  texto("Renta de audio y RF · Medellín", M, y + 6, { size: 9, color: SUAVE });
  texto(TITULOS[d.tipo], W - M, y - 2, { size: 12, bold: true, color: ACENTO, align: "right" });
  texto(`N.º ${d.numero}`, W - M, y + 4, { size: 10, bold: true, align: "right" });
  texto(`Emitido: ${fecha(d.emitido)}`, W - M, y + 9, { size: 8.5, color: SUAVE, align: "right" });
  if (d.validoHasta) texto(`Válida hasta: ${fecha(d.validoHasta)}`, W - M, y + 13.5, { size: 8.5, color: SUAVE, align: "right" });
  if (d.estado) texto(`Estado: ${d.estado}`, W - M, y + 13.5, { size: 8.5, color: SUAVE, align: "right" });
  y += 22;

  // ---- Partes ----
  const caja = (x: number, titulo: string, lineas: string[]) => {
    const w = (ANCHO - 6) / 2;
    doc.setFillColor(...FONDO);
    doc.roundedRect(x, y, w, 26, 2.5, 2.5, "F");
    texto(titulo.toUpperCase(), x + 5, y + 6, { size: 7.5, bold: true, color: SUAVE });
    let yy = y + 12;
    lineas.filter(Boolean).forEach((l, i) => {
      const n = texto(l, x + 5, yy, { size: i === 0 ? 10.5 : 8.5, bold: i === 0, color: i === 0 ? TINTA : SUAVE, max: w - 10 });
      yy += (i === 0 ? 5 : 4) * n;
    });
  };
  caja(M, "Cliente", [d.cliente.nombre || "Por confirmar"]);
  caja(M + (ANCHO - 6) / 2 + 6, "Compañía", [
    d.compania.nombre,
    d.compania.zona ? `Bodega en ${d.compania.zona}` : "",
  ]);
  y += 33;

  // ---- Evento ----
  texto("EVENTO", M, y, { size: 7.5, bold: true, color: SUAVE });
  y += 5;
  const filaEvento = (k: string, v: string) => {
    texto(k, M, y, { size: 9, color: SUAVE });
    const n = texto(v, M + 38, y, { size: 9.5, max: ANCHO - 38 });
    y += 5 * n;
  };
  filaEvento("Lugar", d.evento.lugar + (d.evento.direccion ? ` · ${d.evento.direccion}` : ""));
  filaEvento("Entrega", fecha(d.evento.entrega));
  filaEvento("Recogida", fecha(d.evento.recogida));
  filaEvento("Días cobrados", `${d.evento.dias} ${d.evento.dias === 1 ? "día" : "días"} (uno por cada 24 horas)`);
  filaEvento(
    "Logística",
    d.evento.modalidad === "entrega"
      ? `Entrega y recogida en el lugar${d.evento.distanciaKm != null ? ` (${String(Math.round(d.evento.distanciaKm * 10) / 10).replace(".", ",")} km de la bodega)` : ""}`
      : `El cliente recoge y devuelve en la bodega${d.compania.direccionBodega ? `: ${d.compania.direccionBodega}` : ""}${d.compania.horario ? ` (${d.compania.horario})` : ""}`,
  );
  y += 4;

  // ---- Tabla de equipos ----
  const cols = [
    { t: "Equipo", x: M + 3, w: 78, a: "left" as const },
    { t: "Cant.", x: M + 96, w: 14, a: "right" as const },
    { t: "Precio / 24 h", x: M + 128, w: 30, a: "right" as const },
    { t: "Días", x: M + 142, w: 12, a: "right" as const },
    { t: "Subtotal", x: W - M - 3, w: 30, a: "right" as const },
  ];
  const encabezadoTabla = () => {
    doc.setFillColor(...TINTA);
    doc.roundedRect(M, y, ANCHO, 8, 1.5, 1.5, "F");
    cols.forEach((c) => texto(c.t, c.x, y + 5.4, { size: 8.5, bold: true, color: [255, 255, 255], align: c.a }));
    y += 8;
  };
  encabezadoTabla();
  const filas = [
    ...d.items.map((i) => ({ nombre: i.nombre, cant: String(i.cantidad), precio: cop(i.precioDia), dias: String(d.evento.dias), sub: cop(i.precioDia * i.cantidad * d.evento.dias) })),
    ...(d.tecnico && d.tecnico.valor > 0
      ? [{ nombre: `${d.tecnico.nombre} (técnico)`, cant: "1", precio: cop(d.tecnico.valor / d.evento.dias), dias: String(d.evento.dias), sub: cop(d.tecnico.valor) }]
      : []),
  ];
  filas.forEach((f, k) => {
    const lineas = doc.splitTextToSize(limpio(f.nombre), cols[0].w);
    const alto = Math.max(8, 4.6 * lineas.length + 3.4);
    nuevaPaginaSiHaceFalta(alto);
    if (k % 2 === 1) {
      doc.setFillColor(...FONDO);
      doc.rect(M, y, ANCHO, alto, "F");
    }
    texto(f.nombre, cols[0].x, y + 5.4, { size: 9, max: cols[0].w });
    texto(f.cant, cols[1].x, y + 5.4, { size: 9, align: "right" });
    texto(f.precio, cols[2].x, y + 5.4, { size: 9, align: "right" });
    texto(f.dias, cols[3].x, y + 5.4, { size: 9, align: "right" });
    texto(f.sub, cols[4].x, y + 5.4, { size: 9, bold: true, align: "right" });
    y += alto;
  });
  doc.setDrawColor(...LINEA);
  doc.line(M, y, W - M, y);
  y += 6;

  // ---- Totales ----
  const c = d.cobro;
  const base = c.alquiler + c.transporte + c.tecnico;
  type Fila = { k: string; v: string; fuerte?: boolean; linea?: boolean };
  const totales: Fila[] =
    d.tipo === "liquidacion"
      ? [
          { k: `Alquiler (${d.evento.dias} ${d.evento.dias === 1 ? "día" : "días"})`, v: cop(c.alquiler) },
          { k: "Transporte", v: d.evento.modalidad === "retiro" ? "Retiro en bodega · $ 0" : cop(c.transporte) },
          ...(c.tecnico > 0 ? [{ k: "Técnico", v: cop(c.tecnico) }] : []),
          { k: "Subtotal del servicio", v: cop(base), linea: true },
          { k: "Comisión ENRENTA (10 %)", v: "- " + cop(c.comision ?? Math.round(base * 0.1)) },
          { k: "NETO A RECIBIR", v: cop(base - (c.comision ?? Math.round(base * 0.1))), fuerte: true, linea: true },
          { k: `Depósito del cliente en garantía (${c.depositoPct} %)`, v: cop(c.deposito) },
        ]
      : [
          { k: `Alquiler (${d.evento.dias} ${d.evento.dias === 1 ? "día" : "días"})`, v: cop(c.alquiler) },
          { k: "Transporte (entrega y recogida)", v: d.evento.modalidad === "retiro" ? "Retiro en bodega · $ 0" : cop(c.transporte) },
          ...(c.tecnico > 0 ? [{ k: "Técnico", v: cop(c.tecnico) }] : []),
          { k: "Tarifa de servicio ENRENTA (7 %)", v: cop(c.servicio) },
          { k: `Depósito reembolsable (${c.depositoPct} %)`, v: cop(c.deposito) },
          { k: "TOTAL", v: cop(c.total), fuerte: true, linea: true },
        ];
  nuevaPaginaSiHaceFalta(totales.length * 7 + 10);
  const xK = W - M - 95;
  totales.forEach((f) => {
    if (f.linea) {
      doc.setDrawColor(...LINEA);
      doc.line(xK, y - 4.2, W - M, y - 4.2);
    }
    texto(f.k, xK, y, { size: f.fuerte ? 11 : 9.5, bold: f.fuerte, color: f.fuerte ? TINTA : SUAVE });
    texto(f.v, W - M, y, { size: f.fuerte ? 12 : 9.5, bold: true, align: "right", color: f.fuerte ? ACENTO : TINTA });
    y += f.fuerte ? 8 : 6;
  });
  y += 4;

  // ---- Notas ----
  const notas: Record<TipoDoc, string[]> = {
    cotizacion: [
      "Cotización informativa: los equipos quedan apartados solo cuando la compañía acepta la reserva.",
      "Los precios los define la compañía. Se cobra un día por cada 24 horas entre la entrega y la recogida.",
      "El depósito es reembolsable y se devuelve al cerrar la entrega sin novedades.",
    ],
    comprobante: [
      "Este comprobante no es una factura electrónica. La factura electrónica (DIAN) se emitirá cuando ENRENTA active la facturación electrónica.",
      "El depósito es reembolsable y se devuelve al cerrar la entrega sin novedades ni casos abiertos.",
      "Entrega y devolución con registro fotográfico en ENRENTA.",
    ],
    liquidacion: [
      "Documento interno para la compañía. El pago se libera al registrar la revisión final sin casos abiertos.",
      "El depósito del cliente lo retiene ENRENTA en garantía y no hace parte del pago a la compañía.",
    ],
  };
  nuevaPaginaSiHaceFalta(notas[d.tipo].length * 9 + 8);
  doc.setFillColor(...FONDO);
  doc.setFontSize(8.5); // medir con el mismo tamaño con que se escriben las notas
  const altoNotas = notas[d.tipo].reduce((a, n) => a + 4.4 * doc.splitTextToSize("•  " + n, ANCHO - 14).length + 1.5, 4);
  doc.roundedRect(M, y, ANCHO, altoNotas, 2.5, 2.5, "F");
  let yn = y + 6;
  notas[d.tipo].forEach((n) => {
    const l = texto("•  " + n, M + 5, yn, { size: 8.5, color: SUAVE, max: ANCHO - 14 });
    yn += 4.4 * l + 1.5;
  });

  // ---- Pie en cada página ----
  const paginas = doc.getNumberOfPages();
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p);
    doc.setDrawColor(...LINEA);
    doc.line(M, H - 14, W - M, H - 14);
    texto("ENRENTA · Medellín, Colombia", M, H - 9, { size: 7.5, color: SUAVE });
    texto(`Página ${p} de ${paginas}`, W - M, H - 9, { size: 7.5, color: SUAVE, align: "right" });
  }
  return doc;
}
