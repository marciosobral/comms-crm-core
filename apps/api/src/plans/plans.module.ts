import { AuditModule } from "@/audit";
import { PermissionsModule } from "@/permissions";
import { PrismaModule } from "@/prisma";
import { Module } from "@nestjs/common";
import { PlansController } from "./plans.controller";
import { PlansService } from "./plans.service";

@Module({
  imports: [PrismaModule, PermissionsModule, AuditModule],
  controllers: [PlansController],
  providers: [PlansService],
})
export class PlansModule {}
