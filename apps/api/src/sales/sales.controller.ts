import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { type AuditContext, AuditCtx } from "../audit/audit-context.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentActor } from "../permissions/current-actor.decorator";
import { PermissionsGuard } from "../permissions/permissions.guard";
import type { RequestActor } from "../permissions/request-actor";
import { RequirePermission } from "../permissions/require-permission.decorator";
import {
  CancelSaleDto,
  CreateSaleDto,
  ListSalesQuery,
  SetSaleAuditDto,
  SetSaleBrscanDto,
  SetSaleSellerDto,
  SetSaleStatusDto,
  UpdateSaleDto,
} from "./dto";
import { SalesService } from "./sales.service";

@Controller("sales")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  @Get()
  async list(@Query() query: ListSalesQuery, @CurrentActor() actor: RequestActor) {
    return this.sales.list(query, actor);
  }

  @Get(":id")
  async detail(@Param("id") id: string, @CurrentActor() actor: RequestActor) {
    return this.sales.detail(id, actor);
  }

  @Get(":id/history")
  async history(@Param("id") id: string, @CurrentActor() actor: RequestActor) {
    return this.sales.history(id, actor);
  }

  @Post()
  @RequirePermission("sales.create")
  async create(
    @Body() dto: CreateSaleDto,
    @CurrentActor() actor: RequestActor,
    @AuditCtx() ctx: AuditContext,
  ) {
    return this.sales.create(dto, actor, ctx);
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateSaleDto,
    @CurrentActor() actor: RequestActor,
    @AuditCtx() ctx: AuditContext,
  ) {
    return this.sales.update(id, dto, actor, ctx);
  }

  @Patch(":id/status")
  async setStatus(
    @Param("id") id: string,
    @Body() dto: SetSaleStatusDto,
    @CurrentActor() actor: RequestActor,
    @AuditCtx() ctx: AuditContext,
  ) {
    return this.sales.setStatus(id, dto.statusId, actor, ctx);
  }

  @Patch(":id/audit")
  async setAudit(
    @Param("id") id: string,
    @Body() dto: SetSaleAuditDto,
    @CurrentActor() actor: RequestActor,
    @AuditCtx() ctx: AuditContext,
  ) {
    return this.sales.setAudit(id, dto.ok, actor, ctx);
  }

  @Patch(":id/brscan")
  async setBrscan(
    @Param("id") id: string,
    @Body() dto: SetSaleBrscanDto,
    @CurrentActor() actor: RequestActor,
    @AuditCtx() ctx: AuditContext,
  ) {
    return this.sales.setBrscan(id, dto.approved, actor, ctx);
  }

  @Patch(":id/seller")
  async setSeller(
    @Param("id") id: string,
    @Body() dto: SetSaleSellerDto,
    @CurrentActor() actor: RequestActor,
    @AuditCtx() ctx: AuditContext,
  ) {
    return this.sales.setSeller(id, dto.sellerId, actor, ctx);
  }

  @Post(":id/cancel")
  async cancel(
    @Param("id") id: string,
    @Body() dto: CancelSaleDto,
    @CurrentActor() actor: RequestActor,
    @AuditCtx() ctx: AuditContext,
  ) {
    return this.sales.cancel(id, dto.reason, actor, ctx);
  }
}
