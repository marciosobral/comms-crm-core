import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { AuditContext, AuditCtx } from "../audit/audit-context.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../permissions/permissions.guard";
import { RequirePermission } from "../permissions/require-permission.decorator";
import { DomainValuesService } from "./domain-values.service";
import {
  CreateDomainValueDto,
  ListDomainValuesQuery,
  UpdateDomainValueDto,
  UpdateSettingDto,
} from "./dto";
import { SystemSettingsService } from "./system-settings.service";

@Controller("settings")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission("settings.manage")
export class SettingsController {
  constructor(
    private readonly domainValues: DomainValuesService,
    private readonly systemSettings: SystemSettingsService,
  ) {}

  @Get("domain-values")
  listDomainValues(@Query() query: ListDomainValuesQuery) {
    return this.domainValues.list(query.type);
  }

  @Post("domain-values")
  createDomainValue(@Body() dto: CreateDomainValueDto, @AuditCtx() ctx: AuditContext) {
    return this.domainValues.create(dto, ctx);
  }

  @Patch("domain-values/:id")
  updateDomainValue(
    @Param("id") id: string,
    @Body() dto: UpdateDomainValueDto,
    @AuditCtx() ctx: AuditContext,
  ) {
    return this.domainValues.update(id, dto, ctx);
  }

  @Get("system")
  listSystem() {
    return this.systemSettings.list();
  }

  @Patch("system/:key")
  updateSystem(
    @Param("key") key: string,
    @Body() dto: UpdateSettingDto,
    @AuditCtx() ctx: AuditContext,
  ) {
    return this.systemSettings.update(key, dto.value, ctx);
  }
}
