/** Utilitários de data no fuso America/Sao_Paulo (Brasília, UTC−3). */

export function getBrasiliaDateParts(date: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const read = (type: string) => parts.find((part) => part.type === type)?.value || "00";

  return {
    year: Number(read("year")),
    month: Number(read("month")),
    day: Number(read("day")),
    hour: Number(read("hour")),
    minute: Number(read("minute")),
    second: Number(read("second")),
  };
}

export function getBrasiliaMonthKey(date: Date = new Date()) {
  const { year, month } = getBrasiliaDateParts(date);
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** Instante UTC equivalente a 00:00:00 do dia 1º do mês corrente em Brasília. */
export function getBrasiliaMonthStartUtc(date: Date = new Date()) {
  const monthKey = getBrasiliaMonthKey(date);
  return new Date(`${monthKey}-01T00:00:00-03:00`);
}

export function isBrasiliaMonthTurnoverWindow(date: Date = new Date()) {
  const { day } = getBrasiliaDateParts(date);
  return day === 1;
}
