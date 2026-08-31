import { Module } from "@nestjs/common";
import { LoggingModule } from "../logging";
import { PermissionsModule } from "../permissions";
import { PrismaModule } from "../prisma";
import { SettingsModule } from "../settings";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";

@Module({
  imports: [PrismaModule, LoggingModule, SettingsModule, PermissionsModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
