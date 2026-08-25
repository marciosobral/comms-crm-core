import { Module } from "@nestjs/common";
import { AuditModule } from "../audit";
import { PermissionsModule } from "../permissions";
import { PrismaModule } from "../prisma";
import { DomainValuesService } from "./domain-values.service";
import { SettingsController } from "./settings.controller";
import { SystemSettingsService } from "./system-settings.service";

@Module({
  imports: [PrismaModule, PermissionsModule, AuditModule],
  controllers: [SettingsController],
  providers: [DomainValuesService, SystemSettingsService],
  exports: [SystemSettingsService],
})
export class SettingsModule {}
