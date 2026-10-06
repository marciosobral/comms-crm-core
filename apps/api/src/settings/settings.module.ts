import { AuditModule } from "@/audit";
import { PermissionsModule } from "@/permissions";
import { PrismaModule } from "@/prisma";
import { Module } from "@nestjs/common";
import { DomainValuesPublicController } from "./domain-values-public.controller";
import { DomainValuesService } from "./domain-values.service";
import { NotificationSoundPublicController } from "./notification-sound-public.controller";
import { NotificationSoundService } from "./notification-sound.service";
import { SettingsController } from "./settings.controller";
import { SystemSettingsService } from "./system-settings.service";

@Module({
  imports: [PrismaModule, PermissionsModule, AuditModule],
  controllers: [
    SettingsController,
    DomainValuesPublicController,
    NotificationSoundPublicController,
  ],
  providers: [DomainValuesService, SystemSettingsService, NotificationSoundService],
  exports: [SystemSettingsService],
})
export class SettingsModule {}
