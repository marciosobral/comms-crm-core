import { api } from "@/lib/api";
import { downloadBlob } from "@/lib/csv";
import { reportsKeys } from "@/lib/query-keys";
import { toQueryString } from "@/lib/query-string";
import type { RevenueReport } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";

export function useRevenue(from?: string, to?: string) {
  return useQuery({
    queryKey: reportsKeys.revenue(from, to),
    queryFn: () => api.get<RevenueReport>(`/reports/revenue${toQueryString({ from, to })}`),
  });
}

export async function downloadRevenueCsv(from?: string, to?: string): Promise<void> {
  const blob = await api.download(`/reports/revenue.csv${toQueryString({ from, to })}`);
  downloadBlob(blob, "receitas.csv");
}
