export interface RevenueSaleRow {
  amount: string | number;
  date: Date;
  canceledAt: Date | null;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
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

  return { totalAmount, monthAmount, avgTicket, conversionRate, monthlySeries };
}
