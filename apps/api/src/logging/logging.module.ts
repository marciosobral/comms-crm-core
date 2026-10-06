import { Module } from "@nestjs/common";
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { HttpExceptionFilter } from "./http-exception.filter";
import { LoggingInterceptor } from "./logging.interceptor";
import { WinstonLoggerService } from "./winston-logger.service";

@Module({
  providers: [
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    WinstonLoggerService,
  ],
  exports: [WinstonLoggerService],
})
export class LoggingModule {}
