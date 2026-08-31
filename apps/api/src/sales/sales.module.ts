import { Module } from "@nestjs/common";
import { AuditModule } from "../audit";
import { NotificationsModule } from "../notifications";
import { PermissionsModule } from "../permissions";
import { PrismaModule } from "../prisma";
import { SalesController } from "./sales.controller";
import { SalesService } from "./sales.service";

@Module({
  imports: [PrismaModule, PermissionsModule, AuditModule, NotificationsModule],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
