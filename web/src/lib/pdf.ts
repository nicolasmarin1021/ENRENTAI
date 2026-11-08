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

const ACENTO: [number, number, number] = [91, 120, 240];
const TINTA: [number, number, number] = [42, 46, 53];
const SUAVE: [number, number, number] = [107, 113, 120];
const LINEA: [number, number, number] = [220, 223, 229];
const FONDO: [number, number, number] = [244, 245, 248];

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
  texto("ENRENTA", M, y, { size: 20, bold: true });
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
