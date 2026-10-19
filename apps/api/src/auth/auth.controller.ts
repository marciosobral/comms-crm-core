import { type AuditContext, AuditCtx } from "@/audit/audit-context.decorator";
import { currentSandboxId } from "@/common/sandbox-context";
import type { Env } from "@/config";
import { WinstonLoggerService } from "@/logging/winston-logger.service";
import { SandboxRegistry } from "@/prisma";
import { Body, Controller, Get, Post, Request, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { LoginDto, RefreshDto } from "./dto";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sandboxes: SandboxRegistry,
    private readonly config: ConfigService<Env, true>,
    private readonly logger: WinstonLoggerService,
  ) {}

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("login")
  login(@Body() dto: LoginDto, @AuditCtx() ctx: AuditContext) {
    return this.auth.login(dto.identifier, dto.password, { ip: ctx.ip, userAgent: ctx.userAgent });
  }

  @Post("refresh")
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post("logout")
  async logout(@Request() req: { user: { id: string; sessionId?: string } }): Promise<void> {
    await this.auth.logout(req.user.id, req.user.sessionId);
    const sandboxId = currentSandboxId();
    if (!this.config.get("DEMO_MODE") || !sandboxId) return;
    // The idle cleanup still catches the sandbox if freeing it fails here.
    await this.sandboxes
      .release(sandboxId)
      .catch((error) =>
        this.logger.error(
          `demo sandbox release failed: ${String(error)}`,
          undefined,
          AuthController.name,
        ),
      );
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  me(@Request() req: { user: { id: string } }) {
    return this.auth.getProfile(req.user.id);
  }
}
