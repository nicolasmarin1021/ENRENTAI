// Fechas, horas y pesos en el formato de Medellín.
// Se calculan a mano (sin Intl) para que se vean igual en cualquier celular.
// Colombia está siempre en UTC−5 (no tiene horario de verano).

const OFFSET_CO = -5 * 60 * 60 * 1000;
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const dos = (n: number) => String(n).padStart(2, "0");

// Partes de una fecha en hora de Medellín.
function partesCO(fecha: Date) {
  const d = new Date(+fecha + OFFSET_CO);
  return {
    anio: d.getUTCFullYear(),
    mes: d.getUTCMonth(),
    dia: d.getUTCDate(),
    semana: d.getUTCDay(),
    hora: d.getUTCHours(),
    minuto: d.getUTCMinutes(),
  };
}

// "sáb 22 nov"
export function diaCO(iso: string | Date) {
  const p = partesCO(new Date(iso));
  return `${DIAS[p.semana]} ${p.dia} ${MESES[p.mes]}`;
}

// "sáb 22 nov · 14:00"
export function fechaCO(iso: string | Date) {
  const p = partesCO(new Date(iso));
  return `${DIAS[p.semana]} ${p.dia} ${MESES[p.mes]} · ${dos(p.hora)}:${dos(p.minuto)}`;
}

// "sáb 22 nov – dom 23 nov" (o un solo día).
export function rangoCO(desde: string, hasta: string) {
  const a = diaCO(desde);
  const b = diaCO(hasta);
  return a === b ? a : `${a} – ${b}`;
}

// 1500000 → "$1.500.000"
export function pesos(n: number) {
  const v = Math.round(Number(n) || 0);
  const signo = v < 0 ? "-" : "";
  return `${signo}$${String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

// 1500000 → "$1,5 M" · 85000 → "$85 mil"
export function pesosCorto(n: number) {
  return n >= 1_000_000 ? `$${String(Math.round(n / 100_000) / 10).replace(".", ",")} M` : `$${Math.round(n / 1000)} mil`;
}

// Montos escritos a mano: "150.000" ⇄ 150000.
export const soloNumero = (v: string) => Number(v.replace(/\D/g, "") || 0);
export const conPuntos = (v: string | number) => {
  const n = String(v).replace(/\D/g, "");
  return n ? n.replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "";
};

// ---- Fechas del pedido: "AAAA-MM-DDTHH:mm" en la hora del celular ----

// Lee "AAAA-MM-DDTHH:mm" como hora local (sin depender de cómo cada motor interpreta el texto).
export function leerLocal(s: string): Date | null {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]));
}

// "AAAA-MM-DDTHH:mm" → ISO con zona horaria (lo que guarda Supabase).
export const aISO = (local: string) => (leerLocal(local) ?? new Date(NaN)).toISOString();

// "AAAA-MM-DD" de una fecha local.
export const ymdLocal = (d: Date) => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;

// "AAAA-MM-DDTHH:mm" a partir de hoy + días, a una hora dada.
export function fechaLocal(diasDesdeHoy: number, hora: number) {
  const d = new Date();
  d.setDate(d.getDate() + diasDesdeHoy);
  return `${ymdLocal(d)}T${dos(hora)}:00`;
}

// Días cobrados: uno por cada 24 h entre entrega y recogida (24 h exactas = 1 día).
export function diasDeRenta(entrega: string, recogida: string) {
  const a = leerLocal(entrega);
  const b = leerLocal(recogida);
  if (!a || !b || b <= a) return 0;
  return Math.max(1, Math.ceil((+b - +a) / 36e5 / 24 - 1e-9));
}

// "sáb 22 nov · 14:00" a partir de "AAAA-MM-DDTHH:mm" local.
export function textoFecha(local: string) {
  const d = leerLocal(local);
  if (!d) return "";
  return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]} · ${dos(d.getHours())}:${dos(d.getMinutes())}`;
}

// "21 – 22 nov" (o "30 nov – 2 dic") a partir de dos fechas "AAAA-MM-DDTHH:mm" locales.
export function rangoCorto(desde: string, hasta: string) {
  const a = leerLocal(desde);
  const b = leerLocal(hasta);
  if (!a || !b) return "";
  if (a.getMonth() === b.getMonth()) return a.getDate() === b.getDate() ? `${a.getDate()} ${MESES[a.getMonth()]}` : `${a.getDate()} – ${b.getDate()} ${MESES[b.getMonth()]}`;
  return `${a.getDate()} ${MESES[a.getMonth()]} – ${b.getDate()} ${MESES[b.getMonth()]}`;
}

// Etiqueta de un día para elegir fechas: "Hoy", "Mañana" o "sáb 22 nov".
export function etiquetaDia(ymd: string) {
  const hoy = ymdLocal(new Date());
  const man = new Date();
  man.setDate(man.getDate() + 1);
  if (ymd === hoy) return "Hoy";
  if (ymd === ymdLocal(man)) return "Mañana";
  const d = leerLocal(`${ymd}T12:00`);
  return d ? `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}` : ymd;
}

// Iniciales para el avatar: "Ana María" → "AM".
export function iniciales(texto: string) {
  const partes = texto.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "?";
  return (partes[0][0] + (partes[1]?.[0] ?? "")).toUpperCase();
}

// "1 día" / "3 días"
export const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
