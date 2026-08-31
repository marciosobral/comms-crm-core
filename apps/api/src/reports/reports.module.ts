import { Module } from "@nestjs/common";
import { PermissionsModule } from "../permissions";
import { PrismaModule } from "../prisma";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";

@Module({
  imports: [PrismaModule, PermissionsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
