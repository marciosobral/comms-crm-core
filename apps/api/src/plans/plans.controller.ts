import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { type AuditContext, AuditCtx } from "../audit/audit-context.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../permissions/permissions.guard";
import { RequirePermission } from "../permissions/require-permission.decorator";
import { CreatePlanDto, SetActiveDto, UpdatePlanDto } from "./dto";
import { PlansService } from "./plans.service";

@Controller("plans")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PlansController {
  constructor(private readonly plans: PlansService) {}

  @Get()
  list(@Query("active") active?: string) {
    return this.plans.list(active === "true");
  }

  @Post()
  @RequirePermission("plans.manage")
  create(@Body() dto: CreatePlanDto, @AuditCtx() ctx: AuditContext) {
    return this.plans.create(dto, ctx);
  }

  @Patch(":id")
  @RequirePermission("plans.manage")
  update(@Param("id") id: string, @Body() dto: UpdatePlanDto, @AuditCtx() ctx: AuditContext) {
    return this.plans.update(id, dto, ctx);
  }

  @Patch(":id/active")
  @RequirePermission("plans.manage")
  setActive(@Param("id") id: string, @Body() dto: SetActiveDto, @AuditCtx() ctx: AuditContext) {
    return this.plans.setActive(id, dto.active, ctx);
  }
}
