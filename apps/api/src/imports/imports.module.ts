import { Module } from "@nestjs/common";
import { AuditModule } from "../audit";
import { PermissionsModule } from "../permissions";
import { PrismaModule } from "../prisma";
import { ImportsController } from "./imports.controller";
import { ImportsService } from "./imports.service";
import { MappingsService } from "./mappings.service";

@Module({
  imports: [PrismaModule, PermissionsModule, AuditModule],
  controllers: [ImportsController],
  providers: [ImportsService, MappingsService],
  exports: [ImportsService, MappingsService],
})
export class ImportsModule {}
