import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { type AuditContext, AuditCtx } from "../audit/audit-context.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../permissions/permissions.guard";
import { RequirePermission } from "../permissions/require-permission.decorator";
import { CreateUserDto, SetPasswordDto, SetStatusDto, UpdateUserDto } from "./dto";
import { UsersService } from "./users.service";

@Controller("users")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission("users.manage")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list() {
    return this.users.list();
  }

  @Post()
  create(@Body() dto: CreateUserDto, @AuditCtx() ctx: AuditContext) {
    return this.users.create(dto, ctx);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateUserDto, @AuditCtx() ctx: AuditContext) {
    return this.users.update(id, dto, ctx);
  }

  @Patch(":id/status")
  setStatus(@Param("id") id: string, @Body() dto: SetStatusDto, @AuditCtx() ctx: AuditContext) {
    return this.users.setStatus(id, dto.status, ctx);
  }

  @Patch(":id/password")
  @RequirePermission("users.manage_passwords")
  setPassword(
    @Param("id") id: string,
    @Body() dto: SetPasswordDto,
    @AuditCtx() ctx: AuditContext,
  ) {
    return this.users.setPassword(id, dto.password, ctx);
  }
}
