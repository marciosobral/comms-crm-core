import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Prisma } from "@prisma-client";
import type { Response } from "express";
import { AppException } from "./app-exception";
import { ERROR_DEFINITIONS, ErrorCode } from "./error-codes";
import { WinstonLoggerService } from "./winston-logger.service";

const CODE_BY_STATUS: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: ErrorCode.INVALID_INPUT,
  [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ErrorCode.RESOURCE_NOT_FOUND,
  [HttpStatus.CONFLICT]: ErrorCode.CONFLICT,
  [HttpStatus.PAYLOAD_TOO_LARGE]: ErrorCode.PAYLOAD_TOO_LARGE,
  [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.TOO_MANY_REQUESTS,
};

const CODE_BY_PRISMA_ERROR: Partial<Record<string, ErrorCode>> = {
  P2002: ErrorCode.CONFLICT,
  P2025: ErrorCode.RESOURCE_NOT_FOUND,
  P2003: ErrorCode.INVALID_OPERATION,
};

interface ErrorBody {
  status: number;
  code: ErrorCode;
  message: string;
}

function fromCode(code: ErrorCode): ErrorBody {
  const { status, message } = ERROR_DEFINITIONS[code];
  return { status, code, message };
}

function isPrismaError(exception: unknown): exception is Error {
  return (
    exception instanceof Prisma.PrismaClientKnownRequestError ||
    exception instanceof Prisma.PrismaClientValidationError ||
    exception instanceof Prisma.PrismaClientUnknownRequestError ||
    exception instanceof Prisma.PrismaClientRustPanicError ||
    exception instanceof Prisma.PrismaClientInitializationError
  );
}

// Prisma messages print query arguments (CPF, e-mail), so only the class name and code are logged.
function prismaErrorLabel(exception: Error): string {
  return exception instanceof Prisma.PrismaClientKnownRequestError
    ? `${exception.name} ${exception.code}`
    : exception.name;
}

function validationMessages(exception: HttpException): string[] {
  const response = exception.getResponse();
  if (typeof response !== "object" || response === null || !("message" in response)) return [];
  const { message } = response;
  return Array.isArray(message)
    ? message.filter((item): item is string => typeof item === "string")
    : [];
}

// Every error leaves the API as { code, message } in pt-BR. Only unexpected errors are logged here.
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: WinstonLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const { status, code, message } = this.toBody(exception);
    const response = host.switchToHttp().getResponse<Response>();
    if (response.headersSent) return;
    response.status(status).json({ code, message });
  }

  private toBody(exception: unknown): ErrorBody {
    if (exception instanceof AppException) {
      const response = exception.getResponse();
      const message =
        typeof response === "object" && response !== null && "message" in response
          ? String(response.message)
          : ERROR_DEFINITIONS[exception.code].message;
      return { status: exception.getStatus(), code: exception.code, message };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const messages = status === HttpStatus.BAD_REQUEST ? validationMessages(exception) : [];
      const code = CODE_BY_STATUS[status];
      if (messages.length > 0) {
        return { status, code: ErrorCode.INVALID_INPUT, message: messages.join(" • ") };
      }
      if (code) return { ...fromCode(code), status };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const code = CODE_BY_PRISMA_ERROR[exception.code];
      if (code) return fromCode(code);
    }

    if (isPrismaError(exception)) {
      this.logger.error(prismaErrorLabel(exception), undefined, HttpExceptionFilter.name);
    } else {
      this.logger.error(
        exception instanceof Error ? exception.message : String(exception),
        exception instanceof Error ? exception.stack : undefined,
        HttpExceptionFilter.name,
      );
    }
    return fromCode(ErrorCode.UNKNOWN_ERROR);
  }
}
