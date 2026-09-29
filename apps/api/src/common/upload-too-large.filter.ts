import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpStatus,
  PayloadTooLargeException,
} from "@nestjs/common";
import type { Response } from "express";
import type { ErrorCode } from "../logging/error-codes";

@Catch(PayloadTooLargeException)
export class UploadTooLargeFilter implements ExceptionFilter {
  constructor(
    private readonly code: ErrorCode,
    private readonly message: string,
  ) {}

  catch(_exception: PayloadTooLargeException, host: ArgumentsHost) {
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(HttpStatus.PAYLOAD_TOO_LARGE)
      .json({ code: this.code, message: this.message });
  }
}
