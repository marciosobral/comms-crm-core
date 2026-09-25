import { api } from "@/lib/api";
import type {
  SaleDetail,
  SaleHistoryEntry,
  SalePayload,
  SaleUpdatePayload,
  SalesListResponse,
} from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface SalesFilters {
  statusId?: string;
  sellerId?: string;
  planId?: string;
  city?: string;
  from?: string;
  to?: string;
  page?: number;
  perPage?: number;
}

function toQueryString(filters: SalesFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function useSales(filters: SalesFilters) {
  return useQuery({
    queryKey: ["sales", filters],
    queryFn: () => api.get<SalesListResponse>(`/sales${toQueryString(filters)}`),
  });
}

export function useSale(id: string) {
  return useQuery({ queryKey: ["sale", id], queryFn: () => api.get<SaleDetail>(`/sales/${id}`) });
}

export function useSaleHistory(id: string) {
  return useQuery({
    queryKey: ["sale-history", id],
    queryFn: () => api.get<SaleHistoryEntry[]>(`/sales/${id}/history`),
  });
}

function useInvalidateSale() {
  const queryClient = useQueryClient();
  return (id?: string) => {
    queryClient.invalidateQueries({ queryKey: ["sales"] });
    if (id) {
      queryClient.invalidateQueries({ queryKey: ["sale", id] });
      queryClient.invalidateQueries({ queryKey: ["sale-history", id] });
    }
  };
}

export function useCreateSale() {
  const invalidate = useInvalidateSale();
  return useMutation({
    mutationFn: (payload: SalePayload) => api.post<SaleDetail>("/sales", payload),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateSale() {
  const invalidate = useInvalidateSale();
  return useMutation({
    mutationFn: ({ id, ...payload }: SaleUpdatePayload & { id: string }) =>
      api.patch<SaleDetail>(`/sales/${id}`, payload),
    onSuccess: (_data, vars) => invalidate(vars.id),
  });
}

export function useSetSaleStatus() {
  const invalidate = useInvalidateSale();
  return useMutation({
    mutationFn: ({ id, statusId }: { id: string; statusId: string }) =>
      api.patch<SaleDetail>(`/sales/${id}/status`, { statusId }),
    onSuccess: (_data, vars) => invalidate(vars.id),
  });
}

export function useSetSaleAudit() {
  const invalidate = useInvalidateSale();
  return useMutation({
    mutationFn: ({ id, ok }: { id: string; ok: boolean }) =>
      api.patch<SaleDetail>(`/sales/${id}/audit`, { ok }),
    onSuccess: (_data, vars) => invalidate(vars.id),
  });
}

export function useSetSaleBrscan() {
  const invalidate = useInvalidateSale();
  return useMutation({
    mutationFn: ({ id, approved }: { id: string; approved: boolean }) =>
      api.patch<SaleDetail>(`/sales/${id}/brscan`, { approved }),
    onSuccess: (_data, vars) => invalidate(vars.id),
  });
}

export function useSetSaleSeller() {
  const invalidate = useInvalidateSale();
  return useMutation({
    mutationFn: ({ id, sellerId }: { id: string; sellerId: string }) =>
      api.patch<SaleDetail>(`/sales/${id}/seller`, { sellerId }),
    onSuccess: (_data, vars) => invalidate(vars.id),
  });
}

export function useCancelSale() {
  const invalidate = useInvalidateSale();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post<SaleDetail>(`/sales/${id}/cancel`, { reason }),
    onSuccess: (_data, vars) => invalidate(vars.id),
  });
}
