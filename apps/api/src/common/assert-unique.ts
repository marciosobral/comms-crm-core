import { AppException } from "@/logging/app-exception";
import type { ErrorCode } from "@/logging/error-codes";

export function assertUnique(
  existing: { id: string } | null,
  selfId: string | null,
  code: ErrorCode,
): void {
  if (existing && existing.id !== selfId) {
    throw new AppException(code);
  }
}
