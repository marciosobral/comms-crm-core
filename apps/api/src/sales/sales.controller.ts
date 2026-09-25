import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { type AuditContext, AuditCtx } from "../audit/audit-context.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../permissions/permissions.guard";
import { RequirePermission } from "../permissions/require-permission.decorator";
import {
  CancelSaleDto,
  CreateSaleDto,
  ListSalesQuery,
  SetSaleAuditDto,
  SetSaleSellerDto,
  SetSaleStatusDto,
  UpdateSaleDto,
} from "./dto";
import { SalesService } from "./sales.service";

interface AuthedRequest {
  user: { id: string };
}

@Controller("sales")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  @Get()
  async list(@Query() query: ListSalesQuery, @Request() req: AuthedRequest) {
    const actor = await this.sales.getActor(req.user.id);
    return this.sales.list(query, actor);
  }

  @Get(":id")
  async detail(@Param("id") id: string, @Request() req: AuthedRequest) {
    const actor = await this.sales.getActor(req.user.id);
    return this.sales.detail(id, actor);
  }

  @Get(":id/history")
  async history(@Param("id") id: string, @Request() req: AuthedRequest) {
    const actor = await this.sales.getActor(req.user.id);
    return this.sales.history(id, actor);
  }

  @Post()
  @RequirePermission("sales.create")
  async create(
    @Body() dto: CreateSaleDto,
    @Request() req: AuthedRequest,
    @AuditCtx() ctx: AuditContext,
  ) {
    const actor = await this.sales.getActor(req.user.id);
    return this.sales.create(dto, actor, ctx);
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateSaleDto,
    @Request() req: AuthedRequest,
    @AuditCtx() ctx: AuditContext,
  ) {
    const actor = await this.sales.getActor(req.user.id);
    return this.sales.update(id, dto, actor, ctx);
  }

  @Patch(":id/status")
  async setStatus(
    @Param("id") id: string,
    @Body() dto: SetSaleStatusDto,
    @Request() req: AuthedRequest,
    @AuditCtx() ctx: AuditContext,
  ) {
    const actor = await this.sales.getActor(req.user.id);
    return this.sales.setStatus(id, dto.statusId, actor, ctx);
  }

  @Patch(":id/audit")
  async setAudit(
    @Param("id") id: string,
    @Body() dto: SetSaleAuditDto,
    @Request() req: AuthedRequest,
    @AuditCtx() ctx: AuditContext,
  ) {
    const actor = await this.sales.getActor(req.user.id);
    return this.sales.setAudit(id, dto.ok, actor, ctx);
  }

  @Patch(":id/seller")
  async setSeller(
    @Param("id") id: string,
    @Body() dto: SetSaleSellerDto,
    @Request() req: AuthedRequest,
    @AuditCtx() ctx: AuditContext,
  ) {
    const actor = await this.sales.getActor(req.user.id);
    return this.sales.setSeller(id, dto.sellerId, actor, ctx);
  }

  @Post(":id/cancel")
  async cancel(
    @Param("id") id: string,
    @Body() dto: CancelSaleDto,
    @Request() req: AuthedRequest,
    @AuditCtx() ctx: AuditContext,
  ) {
    const actor = await this.sales.getActor(req.user.id);
    return this.sales.cancel(id, dto.reason, actor, ctx);
  }
}
