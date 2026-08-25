import { Module } from "@nestjs/common";
import { AuditModule } from "../audit";
import { PermissionsModule } from "../permissions";
import { PrismaModule } from "../prisma";
import { RolesController } from "./roles.controller";
import { RolesService } from "./roles.service";

@Module({
  imports: [PrismaModule, PermissionsModule, AuditModule],
  controllers: [RolesController],
  providers: [RolesService],
})
export class RolesModule {}
