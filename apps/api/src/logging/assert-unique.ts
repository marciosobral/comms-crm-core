import { HttpStatus } from "@nestjs/common";
import { AppException } from "./app-exception";
import { ErrorCode } from "./error-codes";

/** Throws when `existing` is a different row than the one being saved (`selfId`), i.e. a uniqueness conflict. */
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
