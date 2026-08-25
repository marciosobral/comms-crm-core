import { Module } from "@nestjs/common";
import { AuditModule } from "../audit";
import { PermissionsModule } from "../permissions";
import { PrismaModule } from "../prisma";
import { SalesModule } from "../sales";
import { SettingsModule } from "../settings";
import { AttachmentsController } from "./attachments.controller";
import { AttachmentsService } from "./attachments.service";

@Module({
  imports: [PrismaModule, PermissionsModule, AuditModule, SalesModule, SettingsModule],
  controllers: [AttachmentsController],
  providers: [AttachmentsService],
})
export class AttachmentsModule {}
