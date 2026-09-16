import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { type AuditContext, AuditCtx } from "../audit/audit-context.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../permissions/permissions.guard";
import { RequirePermission } from "../permissions/require-permission.decorator";
import { CustomersService } from "./customers.service";
import { CreateCustomerDto, ListCustomersQuery, UpdateCustomerDto } from "./dto";

interface AuthedRequest {
  user: { id: string };
}

@Controller("customers")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  @RequirePermission("customers.view")
  async list(@Query() query: ListCustomersQuery, @Request() req: AuthedRequest) {
    const actor = await this.customers.getActor(req.user.id);
    return this.customers.list(query, actor);
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
  async detail(@Param("id") id: string, @Request() req: AuthedRequest) {
    const actor = await this.customers.getActor(req.user.id);
    return this.customers.detail(id, actor);
  }

  @Post()
  @RequirePermission("customers.edit")
  async create(
    @Body() dto: CreateCustomerDto,
    @Request() req: AuthedRequest,
    @AuditCtx() ctx: AuditContext,
  ) {
    const actor = await this.customers.getActor(req.user.id);
    return this.customers.create(dto, ctx, actor);
  }

  @Patch(":id")
  @RequirePermission("customers.edit")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateCustomerDto,
    @Request() req: AuthedRequest,
    @AuditCtx() ctx: AuditContext,
  ) {
    const actor = await this.customers.getActor(req.user.id);
    return this.customers.update(id, dto, ctx, actor);
  }
}
