export const PERMISSION_KEYS = [
  "sales.create",
  "sales.edit",
  "sales.change_status",
  "sales.change_seller",
  "sales.edit_locked_fields",
  "sales.view_all",
  "sales.supervise",
  "customers.view",
  "customers.edit",
  "plans.manage",
  "users.manage",
  "roles.manage",
  "reports.view",
  "reports.export",
  "imports.run",
  "notifications.collections",
  "settings.manage",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

interface PermissionSubject {
  isSuperAdmin: boolean;
  permissions: string[];
}

export function hasPermission(user: PermissionSubject | null, key: PermissionKey): boolean {
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  return user.permissions.includes("*") || user.permissions.includes(key);
}
