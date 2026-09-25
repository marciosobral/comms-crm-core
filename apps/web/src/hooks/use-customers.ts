import { api } from "@/lib/api";
import { downloadBlob } from "@/lib/csv";
import { customersKeys } from "@/lib/query-keys";
import { toQueryString } from "@/lib/query-string";
import type { CustomerDetail, CustomerPayload, CustomersListResponse } from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface CustomersFilters {
  q?: string;
  city?: string;
  state?: string;
  sellerId?: string;
  month?: string;
  page?: number;
  perPage?: number;
}

export function useCustomers(filters: CustomersFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: customersKeys.list(filters),
    queryFn: () => api.get<CustomersListResponse>(`/customers${toQueryString(filters)}`),
    enabled: options?.enabled ?? true,
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: customersKeys.detail(id),
    queryFn: () => api.get<CustomerDetail>(`/customers/${id}`),
  });
}

function useInvalidateCustomers() {
  const queryClient = useQueryClient();
  return (id?: string) => {
    queryClient.invalidateQueries({ queryKey: customersKeys.all });
    if (id) queryClient.invalidateQueries({ queryKey: customersKeys.detail(id) });
  };
}

export function useCreateCustomer() {
  const invalidate = useInvalidateCustomers();
  return useMutation({
    mutationFn: (payload: CustomerPayload) =>
      api.post<CustomerDetail["customer"]>("/customers", payload),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateCustomer() {
  const invalidate = useInvalidateCustomers();
  return useMutation({
    mutationFn: ({ id, ...payload }: CustomerPayload & { id: string }) =>
      api.patch<CustomerDetail["customer"]>(`/customers/${id}`, payload),
    onSuccess: (_data, vars) => invalidate(vars.id),
  });
}

export async function downloadCustomerHistoryCsv(customerId: string): Promise<void> {
  const blob = await api.download(`/customers/${customerId}/history.csv`);
  downloadBlob(blob, "historico-cliente.csv");
}
