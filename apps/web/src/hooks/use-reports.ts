import { api } from "@/lib/api";
import { downloadBlob } from "@/lib/csv";
import { reportsKeys } from "@/lib/query-keys";
import { toQueryString } from "@/lib/query-string";
import type { RevenueReport } from "@/lib/types";
import type { SaleDateBy } from "@comms-crm-core/validation";
import { useQuery } from "@tanstack/react-query";

export function useRevenue(from?: string, to?: string, dateBy: SaleDateBy = "sale") {
  return useQuery({
    queryKey: reportsKeys.revenue(from, to, dateBy),
    queryFn: () => api.get<RevenueReport>(`/reports/revenue${toQueryString({ from, to, dateBy })}`),
  });
}

export async function downloadRevenueCsv(
  from?: string,
  to?: string,
  dateBy: SaleDateBy = "sale",
): Promise<void> {
  const blob = await api.download(`/reports/revenue.csv${toQueryString({ from, to, dateBy })}`);
  downloadBlob(blob, "receitas.csv");
}
