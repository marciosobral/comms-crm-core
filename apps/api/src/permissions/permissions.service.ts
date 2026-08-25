import { HttpStatus, Injectable } from "@nestjs/common";
import { AppException } from "../logging/app-exception";
import { ErrorCode } from "../logging/error-codes";
import { PERMISSION_CATALOG, PermissionKey } from "./permission-catalog";

export interface PermissionSubject {
  isSuperAdmin: boolean;
  status: string;
  role: { permissions: string[] } | null;
}

@Injectable()
export class PermissionsService {
  check(user: PermissionSubject, required: PermissionKey[]): void {
    if (user.status !== "ACTIVE") {
      throw new AppException(ErrorCode.USER_INACTIVE, "Conta inativa", HttpStatus.FORBIDDEN);
    }
    if (user.isSuperAdmin) return;
    const granted = new Set(user.role?.permissions ?? []);
    const missing = required.filter((key) => !granted.has(key));
    if (missing.length > 0) {
      throw new AppException(
        ErrorCode.FORBIDDEN,
        `Sem permissão: ${missing.join(", ")}`,
        HttpStatus.FORBIDDEN,
      );
    }
  }

  assertKnownKeys(keys: string[]): void {
    const catalog = new Set<string>(PERMISSION_CATALOG);
    const unknown = keys.filter((key) => !catalog.has(key));
    if (unknown.length > 0) {
      throw new AppException(
        ErrorCode.PERMISSION_KEY_UNKNOWN,
        `Permissões desconhecidas: ${unknown.join(", ")}`,
      );
    }
  }
}
