// Días y ocupación en hora de Medellín (UTC−5, sin horario de verano).
// Funciona igual en el servidor (que puede estar en UTC) y en el navegador.

const OFFSET = "-05:00";
const DIA = 24 * 60 * 60 * 1000;

// "AAAA-MM-DD" de hoy en Medellín.
export function hoyCO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
}

export const inicioCO = (ymd: string) => new Date(`${ymd}T00:00:00${OFFSET}`);

export function sumarDias(ymd: string, n: number): string {
  const d = new Date(+inicioCO(ymd) + n * DIA + 12 * 60 * 60 * 1000); // mediodía: evita bordes
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(d);
}

export const esYMD = (s: string | undefined | null): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

// Lo que ocupa unidades: una reserva activa o un bloqueo.
export type Movimiento = { equipo_id: string; cantidad: number; desde: string; hasta: string; bloqueo: boolean };

// Unidades reservadas y bloqueadas de un equipo durante un día.
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

export const diaSemana = (ymd: string) =>
  new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", weekday: "short" }).format(inicioCO(ymd)).replace(".", "");
export const numeroDia = (ymd: string) => Number(ymd.slice(8, 10));
export const esFinDeSemana = (ymd: string) => {
  const d = new Date(+inicioCO(ymd) + 12 * 60 * 60 * 1000).getUTCDay();
  return d === 0 || d === 6;
};
