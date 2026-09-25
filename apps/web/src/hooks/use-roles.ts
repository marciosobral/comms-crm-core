import { api } from "@/lib/api";
import { rolesKeys } from "@/lib/query-keys";
import type { SaleFunction } from "@/lib/sale-functions";
import type { Role } from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface RolePayload {
  name: string;
  description?: string;
  active?: boolean;
  permissions: string[];
  saleFunctions: SaleFunction[];
}

export function useRoles() {
  return useQuery({ queryKey: rolesKeys.all, queryFn: () => api.get<Role[]>("/roles") });
}

export function usePermissionCatalog() {
  return useQuery({
    queryKey: rolesKeys.permissionCatalog,
    queryFn: () => api.get<string[]>("/roles/permission-catalog"),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

function useInvalidateRoles() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: rolesKeys.all });
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
    mutationFn: ({ id, ...payload }: { id: string } & Partial<RolePayload>) =>
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
