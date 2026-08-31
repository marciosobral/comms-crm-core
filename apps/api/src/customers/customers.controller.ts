import { Body, Controller, Get, Param, Patch, Post, Query, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { type AuditContext, AuditCtx } from "../audit/audit-context.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../permissions/permissions.guard";
import { RequirePermission } from "../permissions/require-permission.decorator";
import { CustomersService } from "./customers.service";
import { CreateCustomerDto, ListCustomersQuery, UpdateCustomerDto } from "./dto";

@Controller("customers")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  @RequirePermission("customers.view")
  list(@Query() query: ListCustomersQuery) {
    return this.customers.list(query);
  }

  @Get(":id/history.csv")
  @RequirePermission("customers.view")
  async historyCsv(@Param("id") id: string, @Res({ passthrough: true }) res: Response) {
    const csv = await this.customers.historyCsv(id);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="historico-cliente.csv"');
    return csv;
  }

  @Get(":id")
  @RequirePermission("customers.view")
  detail(@Param("id") id: string) {
    return this.customers.detail(id);
  }

  @Post()
  @RequirePermission("customers.edit")
  create(@Body() dto: CreateCustomerDto, @AuditCtx() ctx: AuditContext) {
    return this.customers.create(dto, ctx);
  }

  @Patch(":id")
  @RequirePermission("customers.edit")
  update(@Param("id") id: string, @Body() dto: UpdateCustomerDto, @AuditCtx() ctx: AuditContext) {
    return this.customers.update(id, dto, ctx);
  }
}
