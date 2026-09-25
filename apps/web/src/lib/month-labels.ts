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

export function isoDate(date: Date): string {
  return `${monthKey(date)}-${String(date.getDate()).padStart(2, "0")}`;
}

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthRange(date: Date): { from: string; to: string } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { from: isoDate(start), to: isoDate(end) };
}

export function monthOptions(count = 6): { value: string; label: string }[] {
  const now = new Date();
  const options: { value: string; label: string }[] = [];
  for (let back = 0; back < count; back++) {
    const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const value = monthKey(d);
    options.push({ value, label: `${monthFullName(value)}/${d.getFullYear()}` });
  }
  return options;
}

/** value is "YYYY-MM" */
export function monthToRange(value: string): { from: string; to: string } {
  const [yearStr, monthStr] = value.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return {
    from: `${yearStr}-${monthStr}-01`,
    to: `${yearStr}-${monthStr}-${String(lastDay).padStart(2, "0")}`,
  };
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
  return { from: isoDate(start), to: isoDate(end) };
}
