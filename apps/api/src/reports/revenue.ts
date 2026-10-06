import { dateOnlyMonthKey, shiftMonthKey } from "@comms-crm-core/validation";

export interface RevenueSaleRow {
  amount: string | number;
  date: Date;
  canceledAt: Date | null;
}

export interface PlanRevenueSaleRow extends RevenueSaleRow {
  planName: string | null;
}

export interface PlanRevenueEntry {
  planName: string;
  count: number;
  total: number;
}

export interface KpiDelta {
  current: number;
  previous: number;
  deltaPct: number;
}

export interface KpiDeltas {
  revenue: KpiDelta;
  salesCount: KpiDelta;
  avgTicket: KpiDelta;
  conversionRate: KpiDelta;
}

export function sumAmount(rows: Array<{ amount: string | number }>): number {
  return rows.reduce((sum, row) => sum + Number(row.amount), 0);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

interface PeriodStats {
  amount: number;
  count: number;
  avgTicket: number;
  conversionRate: number;
}

function computePeriodStats(rows: RevenueSaleRow[], key: string): PeriodStats {
  const periodRows = rows.filter((row) => dateOnlyMonthKey(row.date) === key);
  const activeRows = periodRows.filter((row) => row.canceledAt === null);
  const amount = round2(sumAmount(activeRows));
  const count = activeRows.length;
  const avgTicket = count > 0 ? round2(amount / count) : 0;
  const conversionRate = periodRows.length > 0 ? activeRows.length / periodRows.length : 0;
  return { amount, count, avgTicket, conversionRate };
}

function percentDelta(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return round2(((current - previous) / previous) * 100);
}

function buildKpiDeltas(rows: RevenueSaleRow[], referenceMonth: string): KpiDeltas {
  const current = computePeriodStats(rows, referenceMonth);
  const previous = computePeriodStats(rows, shiftMonthKey(referenceMonth, -1));

  return {
    revenue: {
      current: current.amount,
      previous: previous.amount,
      deltaPct: percentDelta(current.amount, previous.amount),
    },
    salesCount: {
      current: current.count,
      previous: previous.count,
      deltaPct: percentDelta(current.count, previous.count),
    },
    avgTicket: {
      current: current.avgTicket,
      previous: previous.avgTicket,
      deltaPct: percentDelta(current.avgTicket, previous.avgTicket),
    },
    conversionRate: {
      current: current.conversionRate,
      previous: previous.conversionRate,
      deltaPct: percentDelta(current.conversionRate, previous.conversionRate),
    },
  };
}

export function aggregateRevenue(rows: RevenueSaleRow[], referenceMonth: string) {
  const active = rows.filter((row) => row.canceledAt === null);
  const totalAmount = round2(sumAmount(active));
  const monthAmount = round2(
    sumAmount(active.filter((row) => dateOnlyMonthKey(row.date) === referenceMonth)),
  );
  const avgTicket = active.length > 0 ? round2(totalAmount / active.length) : 0;
  const conversionRate = rows.length > 0 ? active.length / rows.length : 0;

  const monthlySeries: Array<{ month: string; total: number }> = [];
  for (let back = 5; back >= 0; back -= 1) {
    const key = shiftMonthKey(referenceMonth, -back);
    const total = round2(sumAmount(active.filter((row) => dateOnlyMonthKey(row.date) === key)));
    monthlySeries.push({ month: key, total });
  }

  return {
    totalAmount,
    monthAmount,
    avgTicket,
    conversionRate,
    monthlySeries,
    kpiDeltas: buildKpiDeltas(rows, referenceMonth),
  };
}

export function aggregateRevenueByPlan(
  rows: PlanRevenueSaleRow[],
  referenceMonth: string,
): PlanRevenueEntry[] {
  const active = rows.filter(
    (row) => row.canceledAt === null && dateOnlyMonthKey(row.date) === referenceMonth,
  );

  const byPlan = new Map<string, { count: number; total: number }>();
  for (const row of active) {
    const planName = row.planName ?? "Sem plano";
    const entry = byPlan.get(planName) ?? { count: 0, total: 0 };
    entry.count += 1;
    entry.total = round2(entry.total + Number(row.amount));
    byPlan.set(planName, entry);
  }

  return Array.from(byPlan.entries())
    .map(([planName, { count, total }]) => ({ planName, count, total }))
    .sort((a, b) => b.total - a.total);
}
