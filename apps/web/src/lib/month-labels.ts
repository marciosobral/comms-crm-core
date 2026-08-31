const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

/** month is "YYYY-MM" */
export function monthFullName(month: string): string {
  const index = Number(month.split("-")[1]) - 1;
  return MONTH_NAMES[index] ?? month;
}

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthRange(date: Date): { from: string; to: string } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: iso(start), to: iso(end) };
}

export function lastMonths(count: number, now: Date = new Date()): Date[] {
  return Array.from(
    { length: count },
    (_, i) => new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1),
  );
}

/** Range spanning the 5 months before `endMonth` through the end of `endMonth`. */
export function sixMonthWindow(endMonth: Date): { from: string; to: string } {
  const start = new Date(endMonth.getFullYear(), endMonth.getMonth() - 5, 1);
  const end = new Date(endMonth.getFullYear(), endMonth.getMonth() + 1, 0);
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: iso(start), to: iso(end) };
}
