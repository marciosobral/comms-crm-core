import { JwtAuthGuard } from "@/auth/jwt-auth.guard";
import { CurrentActor } from "@/permissions/current-actor.decorator";
import { PermissionsGuard } from "@/permissions/permissions.guard";
import type { RequestActor } from "@/permissions/request-actor";
import { RequirePermission } from "@/permissions/require-permission.decorator";
import { Controller, Get, Query, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { DateRangeQuery } from "./dto";
import { ReportsService } from "./reports.service";

@Controller("reports")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get("revenue")
  @RequirePermission("reports.view")
  async revenue(@Query() query: DateRangeQuery, @CurrentActor() actor: RequestActor) {
    return this.reports.revenue(actor, query.from, query.to, query.dateBy);
  }

  @Get("revenue.csv")
  @RequirePermission("reports.export")
  async revenueCsv(
    @Query() query: DateRangeQuery,
    @CurrentActor() actor: RequestActor,
    @Res({ passthrough: true }) res: Response,
  ) {
    const csv = await this.reports.revenueCsv(actor, query.from, query.to, query.dateBy);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="receitas.csv"');
    return csv;
  }
}
