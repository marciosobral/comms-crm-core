import { ExecutionContext, HttpStatus, createParamDecorator } from "@nestjs/common";
import type { Request } from "express";
import { AppException } from "../logging/app-exception";
import { ErrorCode } from "../logging/error-codes";
import type { RequestActor } from "./request-actor";

export const CurrentActor = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestActor => {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (!req.actor) {
      throw new AppException(ErrorCode.UNAUTHORIZED, "Não autenticado", HttpStatus.UNAUTHORIZED);
    }
    return req.actor;
  },
);
