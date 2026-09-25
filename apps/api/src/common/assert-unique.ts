import { HttpStatus } from "@nestjs/common";
import { AppException } from "../logging/app-exception";
import { ErrorCode } from "../logging/error-codes";

export function assertUnique(
  existing: { id: string } | null,
  selfId: string | null,
  code: ErrorCode,
  message: string,
): void {
  if (existing && existing.id !== selfId) {
    throw new AppException(code, message, HttpStatus.CONFLICT);
  }
}
