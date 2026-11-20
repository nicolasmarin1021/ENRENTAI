// Días y ocupación en hora de Medellín (UTC−5, sin horario de verano), como web/src/lib/agenda.ts.
// Se calcula a mano (sin Intl) para que dé igual en cualquier celular.

const DIA = 24 * 60 * 60 * 1000;
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const dos = (n: number) => String(n).padStart(2, "0");
const partes = (ymd: string) => ymd.split("-").map(Number) as [number, number, number];

// "AAAA-MM-DD" de hoy en Medellín.
export function hoyCO(): string {
  const d = new Date(Date.now() - 5 * 60 * 60 * 1000);
  return `${d.getUTCFullYear()}-${dos(d.getUTCMonth() + 1)}-${dos(d.getUTCDate())}`;
}

// Medianoche de ese día en Medellín (= 05:00 UTC).
export const inicioCO = (ymd: string) => {
  const [a, m, d] = partes(ymd);
  return new Date(Date.UTC(a, m - 1, d, 5, 0, 0));
};

// Último minuto de ese día en Medellín (23:59).
export const finCO = (ymd: string) => {
  const [a, m, d] = partes(ymd);
  return new Date(Date.UTC(a, m - 1, d, 28, 59, 0));
};

export function sumarDias(ymd: string, n: number): string {
  const [a, m, d] = partes(ymd);
  const x = new Date(Date.UTC(a, m - 1, d + n));
  return `${x.getUTCFullYear()}-${dos(x.getUTCMonth() + 1)}-${dos(x.getUTCDate())}`;
}

const semana = (ymd: string) => {
  const [a, m, d] = partes(ymd);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
};
export const diaSemana = (ymd: string) => DIAS[semana(ymd)];
export const numeroDia = (ymd: string) => Number(ymd.slice(8, 10));
export const mesCorto = (ymd: string) => MESES[Number(ymd.slice(5, 7)) - 1];
export const esFinDeSemana = (ymd: string) => semana(ymd) === 0 || semana(ymd) === 6;
// "sáb 22 nov"
export const textoDia = (ymd: string) => `${diaSemana(ymd)} ${numeroDia(ymd)} ${mesCorto(ymd)}`;

// Lo que ocupa unidades: una solicitud rentada o un bloqueo.
export type Movimiento = { equipo_id: string; cantidad: number; desde: string; hasta: string; bloqueo: boolean };

// Unidades rentadas y bloqueadas de un equipo durante un día.
export function ocupacionDia(movs: Movimiento[], equipoId: string, ymd: string) {
  const a = +inicioCO(ymd);
  const b = a + DIA;
  let usadas = 0;
  let bloqueadas = 0;
  for (const m of movs) {
    if (m.equipo_id !== equipoId) continue;
    if (+new Date(m.desde) < b && +new Date(m.hasta) > a) {
      if (m.bloqueo) bloqueadas += m.cantidad;
      else usadas += m.cantidad;
    }
  }
  return { usadas, bloqueadas };
}
