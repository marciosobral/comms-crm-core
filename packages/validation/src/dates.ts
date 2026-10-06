function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

export function isoLocalDate(date: Date): string {
  return `${monthKey(date)}-${pad2(date.getDate())}`;
}

export const BUSINESS_TIME_ZONE = "America/Sao_Paulo";

export const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const businessParts = new Intl.DateTimeFormat("en-US", {
  timeZone: BUSINESS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
});

// Built on first use: engines without "longOffset" (Safari < 15.4) throw RangeError on creation,
// which must not break importing the whole package.
let businessOffset: Intl.DateTimeFormat | undefined;

function partsOf(instant: Date): { year: number; month: number; day: number; hour: number } {
  const parts = new Map(
    businessParts.formatToParts(instant).map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.get("year")),
    month: Number(parts.get("month")),
    day: Number(parts.get("day")),
    hour: Number(parts.get("hour")),
  };
}

function offsetMinutes(instant: Date): number {
  businessOffset ??= new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    timeZoneName: "longOffset",
  });
  const name = businessOffset.formatToParts(instant).find((part) => part.type === "timeZoneName");
  const match = name?.value.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return match[1] === "-" ? -minutes : minutes;
}

export function dateOnlyKey(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

export function dateOnlyMonthKey(date: Date): string {
  return dateOnlyKey(date).slice(0, 7);
}

export function businessDateKey(instant: Date = new Date()): string {
  const { year, month, day } = partsOf(instant);
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function businessMonthKey(instant: Date = new Date()): string {
  return businessDateKey(instant).slice(0, 7);
}

export function businessToday(): Date {
  return new Date(businessDateKey());
}

export function businessCalendarDate(instant: Date = new Date()): Date {
  const { year, month, day } = partsOf(instant);
  return new Date(year, month - 1, day);
}

export function businessHour(instant: Date = new Date()): number {
  return partsOf(instant).hour;
}

// The offset is read at UTC midnight of that day; São Paulo has had no DST since 2019,
// so it matches the offset at local midnight.
export function businessDayStart(dayKey: string): Date {
  const utcMidnight = new Date(`${dayKey}T00:00:00Z`);
  return new Date(utcMidnight.getTime() - offsetMinutes(utcMidnight) * 60_000);
}

export function shiftMonthKey(monthKeyValue: string, months: number): string {
  const [year, month] = monthKeyValue.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + months, 1));
  return dateOnlyMonthKey(shifted);
}

export function shiftDateKey(dayKey: string, days: number): string {
  const shifted = new Date(`${dayKey}T00:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return dateOnlyKey(shifted);
}

export function businessMonthRange(monthKeyValue: string): { gte: Date; lt: Date } {
  return {
    gte: businessDayStart(`${monthKeyValue}-01`),
    lt: businessDayStart(`${shiftMonthKey(monthKeyValue, 1)}-01`),
  };
}

// "sale" counts by the sale date (venda bruta); "installation" counts by installedAt (gross).
export const SALE_DATE_BY = ["sale", "installation"] as const;
export type SaleDateBy = (typeof SALE_DATE_BY)[number];

export function isSaleDateBy(value: string): value is SaleDateBy {
  return SALE_DATE_BY.some((option) => option === value);
}
