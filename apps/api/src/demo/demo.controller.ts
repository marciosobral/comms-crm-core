import { type AuditContext, AuditCtx } from "@/audit/audit-context.decorator";
import { JwtAuthGuard } from "@/auth/jwt-auth.guard";
import { Body, Controller, Get, Post, Request, UseGuards } from "@nestjs/common";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { publicDemoProfiles } from "./demo-profiles";
import { DemoService } from "./demo.service";
import { DemoProfileDto } from "./dto/demo-profile.dto";

@Controller("demo")
export class DemoController {
  constructor(private readonly demo: DemoService) {}

  @Get("profiles")
  profiles() {
    return publicDemoProfiles();
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60 * 60_000 } })
  @Post("login")
  login(@Body() dto: DemoProfileDto, @AuditCtx() ctx: AuditContext) {
    return this.demo.login(dto.profile, { ip: ctx.ip, userAgent: ctx.userAgent });
  }

  @UseGuards(JwtAuthGuard)
  @Post("switch")
  switchProfile(
    @Body() dto: DemoProfileDto,
    @Request() req: { user: { id: string; sessionId?: string } },
    @AuditCtx() ctx: AuditContext,
  ) {
    return this.demo.switchProfile(dto.profile, req.user, {
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
  }
}
