import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import type { Request } from "express";

export interface AuditContext {
  userId: string;
  ip: string | null;
  userAgent: string | null;
}

export const AuditCtx = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuditContext => {
    const req = ctx.switchToHttp().getRequest<Request>();
    const user = req.user as { id: string } | undefined;
    return {
      userId: user?.id ?? "",
      ip: req.ip ?? null,
      userAgent: req.get("user-agent") ?? null,
    };
  },
);
