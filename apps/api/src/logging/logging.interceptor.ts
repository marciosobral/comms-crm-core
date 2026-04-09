import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { Observable, tap } from "rxjs";
import { PrismaService } from "../prisma";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const start = Date.now();
    const req = context.switchToHttp().getRequest<Request>();

    return next.handle().pipe(
      tap({
        next: () => this.log(req, context, start),
        error: () => this.log(req, context, start),
      }),
    );
  }

  private log(req: Request, context: ExecutionContext, start: number) {
    const res = context.switchToHttp().getResponse<Response>();
    const user = req.user as { id: string } | undefined;

    this.prisma.apiLog
      .create({
        data: {
          userId: user?.id ?? null,
          method: req.method,
          path: req.originalUrl,
          statusCode: res.statusCode,
          responseTime: Date.now() - start,
          ip: req.ip ?? null,
          userAgent: req.get("user-agent") ?? null,
        },
      })
      .catch(() => {});
  }
}
