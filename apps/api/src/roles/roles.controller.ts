import { AuditContext, AuditCtx } from "@/audit/audit-context.decorator";
import { JwtAuthGuard } from "@/auth/jwt-auth.guard";
import { CurrentActor } from "@/permissions/current-actor.decorator";
import { PERMISSION_CATALOG } from "@/permissions/permission-catalog";
import { PermissionsGuard } from "@/permissions/permissions.guard";
import type { RequestActor } from "@/permissions/request-actor";
import { RequirePermission } from "@/permissions/require-permission.decorator";
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { CreateRoleDto, UpdateRoleDto } from "./dto";
import { RolesService } from "./roles.service";

@Controller("roles")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission("roles.manage")
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  list() {
    return this.roles.list();
  }

  @Get("permission-catalog")
  catalog(): readonly string[] {
    return PERMISSION_CATALOG;
  }

  @Post()
  create(@Body() dto: CreateRoleDto, @AuditCtx() ctx: AuditContext) {
    return this.roles.create(dto, ctx);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateRoleDto,
    @AuditCtx() ctx: AuditContext,
    @CurrentActor() actor: RequestActor,
  ) {
    return this.roles.update(id, dto, ctx, actor);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @AuditCtx() ctx: AuditContext) {
    return this.roles.remove(id, ctx);
  }
}
