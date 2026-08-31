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

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function previousMonthKey(now: Date): string {
  return monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
}

interface PeriodStats {
  amount: number;
  count: number;
  avgTicket: number;
  conversionRate: number;
}

function computePeriodStats(rows: RevenueSaleRow[], key: string): PeriodStats {
  const periodRows = rows.filter((row) => monthKey(row.date) === key);
  const activeRows = periodRows.filter((row) => row.canceledAt === null);
  const amount = round2(activeRows.reduce((sum, row) => sum + Number(row.amount), 0));
  const count = activeRows.length;
  const avgTicket = count > 0 ? round2(amount / count) : 0;
  const conversionRate = periodRows.length > 0 ? activeRows.length / periodRows.length : 0;
  return { amount, count, avgTicket, conversionRate };
}

function percentDelta(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return round2(((current - previous) / previous) * 100);
}

function buildKpiDeltas(rows: RevenueSaleRow[], now: Date): KpiDeltas {
  const current = computePeriodStats(rows, monthKey(now));
  const previous = computePeriodStats(rows, previousMonthKey(now));

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

export function aggregateRevenue(rows: RevenueSaleRow[], now: Date) {
  const active = rows.filter((row) => row.canceledAt === null);
  const totalAmount = round2(active.reduce((sum, row) => sum + Number(row.amount), 0));
  const currentMonth = monthKey(now);
  const monthAmount = round2(
    active
      .filter((row) => monthKey(row.date) === currentMonth)
      .reduce((sum, row) => sum + Number(row.amount), 0),
  );
  const avgTicket = active.length > 0 ? round2(totalAmount / active.length) : 0;
  const conversionRate = rows.length > 0 ? active.length / rows.length : 0;

  const monthlySeries: Array<{ month: string; total: number }> = [];
  for (let back = 5; back >= 0; back -= 1) {
    const month = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const key = monthKey(month);
    const total = round2(
      active
        .filter((row) => monthKey(row.date) === key)
        .reduce((sum, row) => sum + Number(row.amount), 0),
    );
    monthlySeries.push({ month: key, total });
  }

  return {
    totalAmount,
    monthAmount,
    avgTicket,
    conversionRate,
    monthlySeries,
    kpiDeltas: buildKpiDeltas(rows, now),
  };
}

export function aggregateRevenueByPlan(rows: PlanRevenueSaleRow[], now: Date): PlanRevenueEntry[] {
  const currentMonth = monthKey(now);
  const active = rows.filter(
    (row) => row.canceledAt === null && monthKey(row.date) === currentMonth,
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
