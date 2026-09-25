import { ExecutionContext, HttpStatus, createParamDecorator } from "@nestjs/common";
import type { Request } from "express";
import { AppException } from "../logging/app-exception";
import { ErrorCode } from "../logging/error-codes";
import type { RequestActor } from "./request-actor";

// PermissionsGuard resolves and attaches the actor for every guarded route, so this
// only throws if the decorator is used on a route that isn't behind that guard.
export const CurrentActor = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestActor => {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (!req.actor) {
      throw new AppException(ErrorCode.UNAUTHORIZED, "Não autenticado", HttpStatus.UNAUTHORIZED);
    }
    return req.actor;
  },
);
