import { api } from "@/lib/api";
import type { Role } from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface RolePayload {
  name: string;
  permissions: string[];
}

export function useRoles() {
  return useQuery({ queryKey: ["roles"], queryFn: () => api.get<Role[]>("/roles") });
}

export function usePermissionCatalog() {
  return useQuery({
    queryKey: ["permission-catalog"],
    queryFn: () => api.get<string[]>("/roles/permission-catalog"),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

function useInvalidateRoles() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["roles"] });
}

export function useCreateRole() {
  const invalidate = useInvalidateRoles();
  return useMutation({
    mutationFn: (payload: RolePayload) => api.post<Role>("/roles", payload),
    onSuccess: invalidate,
  });
}

export function useUpdateRole() {
  const invalidate = useInvalidateRoles();
  return useMutation({
    mutationFn: ({ id, ...payload }: RolePayload & { id: string }) =>
      api.patch<Role>(`/roles/${id}`, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteRole() {
  const invalidate = useInvalidateRoles();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/roles/${id}`),
    onSuccess: invalidate,
  });
}
