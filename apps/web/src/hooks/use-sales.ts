import { api } from "@/lib/api";
import { salesKeys } from "@/lib/query-keys";
import { toQueryString } from "@/lib/query-string";
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

export function useSales(filters: SalesFilters) {
  return useQuery({
    queryKey: salesKeys.list(filters),
    queryFn: () => api.get<SalesListResponse>(`/sales${toQueryString(filters)}`),
  });
}

export function useSale(id: string) {
  return useQuery({
    queryKey: salesKeys.detail(id),
    queryFn: () => api.get<SaleDetail>(`/sales/${id}`),
  });
}

export function useSaleHistory(id: string) {
  return useQuery({
    queryKey: salesKeys.history(id),
    queryFn: () => api.get<SaleHistoryEntry[]>(`/sales/${id}/history`),
  });
}

function useInvalidateSale() {
  const queryClient = useQueryClient();
  return (id?: string) => {
    queryClient.invalidateQueries({ queryKey: salesKeys.all });
    if (id) {
      queryClient.invalidateQueries({ queryKey: salesKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: salesKeys.history(id) });
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
