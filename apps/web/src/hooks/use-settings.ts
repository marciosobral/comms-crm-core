import { api } from "@/lib/api";
import { domainValuesKeys, settingsKeys } from "@/lib/query-keys";
import type { DomainType, DomainValue, SystemSetting } from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useDomainValues(type: DomainType, enabled = true) {
  return useQuery({
    queryKey: domainValuesKeys.list(type),
    queryFn: () => api.get<DomainValue[]>(`/settings/domain-values?type=${type}`),
    enabled,
  });
}

export function useCreateDomainValue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { type: DomainType; value: string; description?: string }) =>
      api.post<DomainValue>("/settings/domain-values", payload),
    onSuccess: (created) =>
      queryClient.invalidateQueries({ queryKey: domainValuesKeys.list(created.type) }),
  });
}

export function useUpdateDomainValue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: {
      id: string;
      value?: string;
      description?: string;
      active?: boolean;
    }) => api.patch<DomainValue>(`/settings/domain-values/${id}`, payload),
    onSuccess: (updated) =>
      queryClient.invalidateQueries({ queryKey: domainValuesKeys.list(updated.type) }),
  });
}

export function useReorderDomainValues() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ type, ids }: { type: DomainType; ids: string[] }) =>
      api.patch<void>("/settings/domain-values/reorder", { type, ids }),
    onMutate: async ({ type, ids }) => {
      await queryClient.cancelQueries({ queryKey: domainValuesKeys.list(type) });
      const previous = queryClient.getQueryData<DomainValue[]>(domainValuesKeys.list(type));
      if (previous) {
        const byId = new Map(previous.map((item) => [item.id, item]));
        const next = ids.flatMap((id) => {
          const item = byId.get(id);
          return item ? [item] : [];
        });
        queryClient.setQueryData(domainValuesKeys.list(type), next);
      }
      return { previous };
    },
    onError: (_error, { type }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(domainValuesKeys.list(type), context.previous);
      }
    },
    onSettled: (_data, _error, { type }) => {
      queryClient.invalidateQueries({ queryKey: domainValuesKeys.list(type) });
      queryClient.invalidateQueries({ queryKey: domainValuesKeys.active(type) });
    },
  });
}

export function useSystemSettings() {
  return useQuery({
    queryKey: settingsKeys.system,
    queryFn: () => api.get<SystemSetting[]>("/settings/system"),
  });
}

export function useUpdateSystemSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) =>
      api.patch<SystemSetting>(`/settings/system/${key}`, { value }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: settingsKeys.system }),
  });
}
