import { Body, Controller, Get, Param, Patch, Query, UseGuards } from "@nestjs/common";
import { type AuditContext, AuditCtx } from "../audit/audit-context.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../permissions/permissions.guard";
import { RequirePermission } from "../permissions/require-permission.decorator";
import { CustomersService } from "./customers.service";
import { UpdateCustomerDto } from "./dto";

@Controller("customers")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  @RequirePermission("customers.view")
  list(@Query("q") q?: string) {
    return this.customers.list(q);
  }

  @Get(":id")
  @RequirePermission("customers.view")
  detail(@Param("id") id: string) {
    return this.customers.detail(id);
  }

  @Patch(":id")
  @RequirePermission("customers.edit")
  update(@Param("id") id: string, @Body() dto: UpdateCustomerDto, @AuditCtx() ctx: AuditContext) {
    return this.customers.update(id, dto, ctx);
  }
}
