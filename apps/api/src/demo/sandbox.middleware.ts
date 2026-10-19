import { runInSandbox } from "@/common/sandbox-context";
import type { Env } from "@/config";
import { isSandboxId } from "@/prisma/sandbox-names";
import { Injectable, NestMiddleware } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { NextFunction, Request, Response } from "express";

/** Runs each request inside the sandbox its token names; refreshes carry the token in the body. */
@Injectable()
export class SandboxMiddleware implements NestMiddleware {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    const sandboxId = this.sandboxOf(req);
    if (sandboxId) runInSandbox(sandboxId, () => next());
    else next();
  }

  private sandboxOf(req: Request): string | null {
    const bearer = /^Bearer (.+)$/.exec(req.headers.authorization ?? "")?.[1];
    if (bearer) return this.verifiedSandbox(bearer, this.config.get("JWT_SECRET"));
    const body: unknown = req.body;
    if (
      typeof body === "object" &&
      body !== null &&
      "refreshToken" in body &&
      typeof body.refreshToken === "string"
    ) {
      return this.verifiedSandbox(body.refreshToken, this.config.get("JWT_REFRESH_SECRET"));
    }
    return null;
  }

  private verifiedSandbox(token: string, secret: string): string | null {
    try {
      const payload: unknown = this.jwt.verify(token, { secret });
      if (typeof payload === "object" && payload !== null && "sbx" in payload) {
        return isSandboxId(payload.sbx) ? payload.sbx : null;
      }
      return null;
    } catch {
      return null;
    }
  }
}
