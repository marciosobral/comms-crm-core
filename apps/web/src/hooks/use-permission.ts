import { useCurrentUser } from "@/hooks/use-current-user";
import { type PermissionKey, hasPermission } from "@/lib/permissions";

export function usePermission(key: PermissionKey): boolean {
  const { user } = useCurrentUser();
  return hasPermission(
    user ? { isSuperAdmin: user.isSuperAdmin, permissions: user.permissions } : null,
    key,
  );
}
