import { Module } from "@nestjs/common";
import { LoggingModule } from "../logging";
import { PrismaModule } from "../prisma";
import { AuditService } from "./audit.service";

@Module({
  imports: [PrismaModule, LoggingModule],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
