import { Module } from "@nestjs/common";
import { AuditModule } from "../audit";
import { PermissionsModule } from "../permissions";
import { PrismaModule } from "../prisma";
import { DomainValuesPublicController } from "./domain-values-public.controller";
import { DomainValuesService } from "./domain-values.service";
import { SettingsController } from "./settings.controller";
import { SystemSettingsService } from "./system-settings.service";

@Module({
  imports: [PrismaModule, PermissionsModule, AuditModule],
  controllers: [SettingsController, DomainValuesPublicController],
  providers: [DomainValuesService, SystemSettingsService],
  exports: [SystemSettingsService],
})
export class SettingsModule {}
