import { api } from "@/lib/api";
import type { RevenueReport } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";

function toQueryString(from?: string, to?: string): string {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function useRevenue(from?: string, to?: string) {
  return useQuery({
    queryKey: ["revenue", from, to],
    queryFn: () => api.get<RevenueReport>(`/reports/revenue${toQueryString(from, to)}`),
  });
}

export async function downloadRevenueCsv(from?: string, to?: string): Promise<void> {
  const blob = await api.download(`/reports/revenue.csv${toQueryString(from, to)}`);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "receitas.csv";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
