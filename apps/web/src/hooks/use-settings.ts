import { api } from "@/lib/api";
import type { DomainType, DomainValue, SystemSetting } from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useDomainValues(type: DomainType) {
  return useQuery({
    queryKey: ["domain-values", type],
    queryFn: () => api.get<DomainValue[]>(`/settings/domain-values?type=${type}`),
  });
}

export function useCreateDomainValue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { type: DomainType; value: string; order?: number }) =>
      api.post<DomainValue>("/settings/domain-values", payload),
    onSuccess: (created) =>
      queryClient.invalidateQueries({ queryKey: ["domain-values", created.type] }),
  });
}

export function useUpdateDomainValue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: { id: string; value?: string; active?: boolean; order?: number }) =>
      api.patch<DomainValue>(`/settings/domain-values/${id}`, payload),
    onSuccess: (updated) =>
      queryClient.invalidateQueries({ queryKey: ["domain-values", updated.type] }),
  });
}

export function useSystemSettings() {
  return useQuery({
    queryKey: ["system-settings"],
    queryFn: () => api.get<SystemSetting[]>("/settings/system"),
  });
}

export function useUpdateSystemSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) =>
      api.patch<SystemSetting>(`/settings/system/${key}`, { value }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["system-settings"] }),
  });
}
