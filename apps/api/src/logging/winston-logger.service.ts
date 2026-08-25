import { Injectable, LoggerService } from "@nestjs/common";
import { Logger as Winston, createLogger, format, transports } from "winston";
import { ErrorCode } from "./error-codes";

@Injectable()
export class WinstonLoggerService implements LoggerService {
  private readonly logger: Winston;

  constructor() {
    this.logger = createLogger({
      level: process.env.NODE_ENV === "production" ? "info" : "debug",
      format: format.combine(format.timestamp(), format.errors({ stack: true }), format.json()),
      transports: [
        new transports.Console({
          format:
            process.env.NODE_ENV === "production"
              ? format.json()
              : format.combine(format.colorize(), format.simple()),
        }),
        new transports.File({ filename: "logs/app.log", maxsize: 10 * 1024 * 1024, maxFiles: 5 }),
        new transports.File({
          filename: "logs/error.log",
          level: "error",
          maxsize: 10 * 1024 * 1024,
          maxFiles: 5,
        }),
      ],
    });
  }

  log(message: unknown, context?: string) {
    this.logger.info(String(message), { context });
  }

  error(message: unknown, trace?: string, context?: string) {
    this.logger.error(String(message), { trace, context });
  }

  warn(message: unknown, context?: string) {
    this.logger.warn(String(message), { context });
  }

  debug(message: unknown, context?: string) {
    this.logger.debug(String(message), { context });
  }

  logError(code: ErrorCode, message: string, meta?: Record<string, unknown>) {
    this.logger.error(message, { code, ...meta });
  }
}
