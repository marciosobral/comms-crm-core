import { Body, Controller, Get, Param, Patch, Post, Query, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { type AuditContext, AuditCtx } from "../audit/audit-context.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentActor } from "../permissions/current-actor.decorator";
import { PermissionsGuard } from "../permissions/permissions.guard";
import type { RequestActor } from "../permissions/request-actor";
import { RequirePermission } from "../permissions/require-permission.decorator";
import { CustomersService } from "./customers.service";
import { CreateCustomerDto, ListCustomersQuery, UpdateCustomerDto } from "./dto";

@Controller("customers")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  @RequirePermission("customers.view")
  async list(@Query() query: ListCustomersQuery, @CurrentActor() actor: RequestActor) {
    return this.customers.list(query, actor);
  }

  @Get("search")
  @RequirePermission("customers.view", "sales.create")
  async searchForNewSale(@Query() query: ListCustomersQuery, @CurrentActor() actor: RequestActor) {
    return this.customers.searchForNewSale(query, actor);
  }

  @Get(":id/history.csv")
  @RequirePermission("customers.view")
  async historyCsv(
    @Param("id") id: string,
    @CurrentActor() actor: RequestActor,
    @Res({ passthrough: true }) res: Response,
  ) {
    const csv = await this.customers.historyCsv(id, actor);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="historico-cliente.csv"');
    return csv;
  }

  @Get(":id")
  @RequirePermission("customers.view")
  async detail(@Param("id") id: string, @CurrentActor() actor: RequestActor) {
    return this.customers.detail(id, actor);
  }

  @Post()
  @RequirePermission("customers.edit")
  async create(
    @Body() dto: CreateCustomerDto,
    @CurrentActor() actor: RequestActor,
    @AuditCtx() ctx: AuditContext,
  ) {
    return this.customers.create(dto, ctx, actor);
  }

  @Patch(":id")
  @RequirePermission("customers.edit")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateCustomerDto,
    @CurrentActor() actor: RequestActor,
    @AuditCtx() ctx: AuditContext,
  ) {
    return this.customers.update(id, dto, ctx, actor);
  }
}
