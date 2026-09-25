export interface KpiDelta {
  current: number;
  previous: number;
  deltaPct: number;
}

export interface RevenueReport {
  totalAmount: number;
  monthAmount: number;
  avgTicket: number;
  conversionRate: number;
  monthlySeries: Array<{ month: string; total: number }>;
  kpiDeltas: {
    revenue: KpiDelta;
    salesCount: KpiDelta;
    avgTicket: KpiDelta;
    conversionRate: KpiDelta;
  };
  revenueByPlan: Array<{ planName: string; count: number; total: number }>;
}
