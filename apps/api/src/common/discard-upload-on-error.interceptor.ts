import { unlink } from "node:fs/promises";
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import type { Request } from "express";
import { Observable, catchError, from, mergeMap, throwError } from "rxjs";

// Multer writes the file to disk before pipes run, so a request rejected by body validation
// would otherwise leave it behind. List this after FileInterceptor so it wraps the pipes.
@Injectable()
export class DiscardUploadOnErrorInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    return next.handle().pipe(
      catchError((error) => {
        const path = req.file?.path;
        if (!path) return throwError(() => error);
        return from(unlink(path).catch(() => undefined)).pipe(
          mergeMap(() => throwError(() => error)),
        );
      }),
    );
  }
}
