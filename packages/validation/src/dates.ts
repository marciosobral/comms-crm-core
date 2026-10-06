function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

export function isoLocalDate(date: Date): string {
  return `${monthKey(date)}-${pad2(date.getDate())}`;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
