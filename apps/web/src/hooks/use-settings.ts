import { api } from "@/lib/api";
import type { DomainType, DomainValue, SystemSetting } from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useDomainValues(type: DomainType, enabled = true) {
  return useQuery({
    queryKey: ["domain-values", type],
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
      queryClient.invalidateQueries({ queryKey: ["domain-values", created.type] }),
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
      queryClient.invalidateQueries({ queryKey: ["domain-values", updated.type] }),
  });
}

export function useReorderDomainValues() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ type, ids }: { type: DomainType; ids: string[] }) =>
      api.patch<void>("/settings/domain-values/reorder", { type, ids }),
    onMutate: async ({ type, ids }) => {
      await queryClient.cancelQueries({ queryKey: ["domain-values", type] });
      const previous = queryClient.getQueryData<DomainValue[]>(["domain-values", type]);
      if (previous) {
        const byId = new Map(previous.map((item) => [item.id, item]));
        const next = ids.flatMap((id) => {
          const item = byId.get(id);
          return item ? [item] : [];
        });
        queryClient.setQueryData(["domain-values", type], next);
      }
      return { previous };
    },
    onError: (_error, { type }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["domain-values", type], context.previous);
      }
    },
    onSettled: (_data, _error, { type }) => {
      queryClient.invalidateQueries({ queryKey: ["domain-values", type] });
      queryClient.invalidateQueries({ queryKey: ["active-domain-values", type] });
    },
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
