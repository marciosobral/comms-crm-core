import { api } from "@/lib/api";
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

function toQueryString(filters: CustomersFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function useCustomers(filters: CustomersFilters) {
  return useQuery({
    queryKey: ["customers", filters],
    queryFn: () => api.get<CustomersListResponse>(`/customers${toQueryString(filters)}`),
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ["customer", id],
    queryFn: () => api.get<CustomerDetail>(`/customers/${id}`),
  });
}

function useInvalidateCustomers() {
  const queryClient = useQueryClient();
  return (id?: string) => {
    queryClient.invalidateQueries({ queryKey: ["customers"] });
    if (id) queryClient.invalidateQueries({ queryKey: ["customer", id] });
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
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "historico-cliente.csv";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
