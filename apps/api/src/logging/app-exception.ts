import { HttpException, type HttpStatus } from "@nestjs/common";
import { ERROR_DEFINITIONS, type ErrorCode } from "./error-codes";

export class AppException extends HttpException {
  constructor(
    readonly code: ErrorCode,
    options: { message?: string; status?: HttpStatus } = {},
  ) {
    const definition = ERROR_DEFINITIONS[code];
    super(
      { code, message: options.message ?? definition.message },
      options.status ?? definition.status,
    );
  }
}
