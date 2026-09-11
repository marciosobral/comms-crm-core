export const PERMISSION_CATALOG = [
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
  "users.manage_passwords",
  "roles.manage",
  "reports.view",
  "reports.export",
  "imports.run",
  "notifications.collections",
  "settings.manage",
] as const;

export type PermissionKey = (typeof PERMISSION_CATALOG)[number];
