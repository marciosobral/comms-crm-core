import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { SSE_METADATA } from "@nestjs/common/constants";
import { Reflector } from "@nestjs/core";
import type { Request, Response } from "express";
import { Observable, catchError, tap, throwError } from "rxjs";
import { PrismaService } from "../prisma";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const start = Date.now();
    const req = context.switchToHttp().getRequest<Request>();

    // A server-sent event stream emits for as long as it is open; log the connection once.
    if (this.reflector.get<boolean>(SSE_METADATA, context.getHandler())) {
      this.log(req, context, start);
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => this.log(req, context, start)),
      catchError((err) => {
        const status = err instanceof HttpException ? err.getStatus() : 500;
        this.log(req, context, start, status);
        return throwError(() => err);
      }),
    );
  }

  private log(req: Request, context: ExecutionContext, start: number, statusOverride?: number) {
    const res = context.switchToHttp().getResponse<Response>();
    const user = req.user as { id: string } | undefined;

    this.prisma.apiLog
      .create({
        data: {
          userId: user?.id ?? null,
          method: req.method,
          path: req.originalUrl,
          statusCode: statusOverride ?? res.statusCode,
          responseTime: Date.now() - start,
          ip: req.ip ?? null,
          userAgent: req.get("user-agent") ?? null,
        },
      })
      .catch((err) => this.logger.error("ApiLog write failed", err));
  }
}
