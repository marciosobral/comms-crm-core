import { SetMetadata } from "@nestjs/common";
import { PermissionKey } from "./permission-catalog";

export const PERMISSIONS_METADATA_KEY = "required_permissions";

export const RequirePermission = (...permissions: PermissionKey[]) =>
  SetMetadata(PERMISSIONS_METADATA_KEY, permissions);
