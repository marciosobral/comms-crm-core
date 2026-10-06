import { ChangeEventsModule } from "@/change-events";
import { LoggingModule } from "@/logging";
import { PrismaModule } from "@/prisma";
import { Module } from "@nestjs/common";
import { AuditService } from "./audit.service";

@Module({
  imports: [PrismaModule, LoggingModule, ChangeEventsModule],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
