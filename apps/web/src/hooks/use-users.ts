import { api } from "@/lib/api";
import { usersKeys } from "@/lib/query-keys";
import type { UserRow } from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface UserPayload {
  name: string;
  email: string;
  cpf?: string;
  phone?: string;
  roleId?: string;
  externalReference?: string | null;
}

export function useUsers() {
  return useQuery({ queryKey: usersKeys.all, queryFn: () => api.get<UserRow[]>("/users") });
}

function useInvalidateUsers() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: usersKeys.all });
}

export function useCreateUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (payload: UserPayload & { password: string; reference?: string }) =>
      api.post<UserRow>("/users", payload),
    onSuccess: invalidate,
  });
}

export function useUpdateUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: ({ id, ...payload }: UserPayload & { id: string }) =>
      api.patch<UserRow>(`/users/${id}`, payload),
    onSuccess: invalidate,
  });
}

export function useSetUserStatus() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ACTIVE" | "INACTIVE" }) =>
      api.patch<UserRow>(`/users/${id}/status`, { status }),
    onSuccess: invalidate,
  });
}

export function useSetUserPassword() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      api.patch<UserRow>(`/users/${id}/password`, { password }),
    onSuccess: invalidate,
  });
}
