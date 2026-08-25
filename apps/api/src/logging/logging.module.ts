import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { LoggingInterceptor } from "./logging.interceptor";
import { WinstonLoggerService } from "./winston-logger.service";

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    WinstonLoggerService,
  ],
  exports: [WinstonLoggerService],
})
export class LoggingModule {}
