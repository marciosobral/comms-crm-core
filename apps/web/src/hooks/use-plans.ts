import { api } from "@/lib/api";
import { plansKeys } from "@/lib/query-keys";
import type { Plan } from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface PlanPayload {
  name: string;
  typeId: string;
  speed?: string;
  features: string[];
  basePrice: number;
  minPrice: number;
  salesScript?: string;
  active?: boolean;
}

export function usePlans() {
  return useQuery({ queryKey: plansKeys.all, queryFn: () => api.get<Plan[]>("/plans") });
}

function useInvalidatePlans() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: plansKeys.all });
}

export function useCreatePlan() {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: (payload: PlanPayload) => api.post<Plan>("/plans", payload),
    onSuccess: invalidate,
  });
}

export function useUpdatePlan() {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: ({ id, ...payload }: PlanPayload & { id: string }) =>
      api.patch<Plan>(`/plans/${id}`, payload),
    onSuccess: invalidate,
  });
}

export function useSetPlanActive() {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.patch<Plan>(`/plans/${id}/active`, { active }),
    onSuccess: invalidate,
  });
}
