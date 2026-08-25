import { HttpException, HttpStatus } from "@nestjs/common";
import { ErrorCode } from "./error-codes";

export class AppException extends HttpException {
  constructor(
    readonly code: ErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super({ code, message }, status);
  }
}
