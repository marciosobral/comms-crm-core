export { PERMISSION_CATALOG, type PermissionKey } from "./permission-catalog";
export { PermissionsService, type PermissionSubject, hasPermission } from "./permissions.service";
export { PermissionsModule } from "./permissions.module";
export { RequirePermission, PERMISSIONS_METADATA_KEY } from "./require-permission.decorator";
export { PermissionsGuard } from "./permissions.guard";
export { CurrentActor } from "./current-actor.decorator";
export type { RequestActor } from "./request-actor";
