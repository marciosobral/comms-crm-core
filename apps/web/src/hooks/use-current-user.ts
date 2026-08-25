import { type AuthUser, authStore } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";

export function useCurrentUser() {
  const query = useQuery<AuthUser>({
    queryKey: ["me"],
    queryFn: () => authStore.getProfile(),
    staleTime: 5 * 60_000,
  });
  return { user: query.data, isLoading: query.isLoading };
}
