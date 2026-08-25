import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma";
import { PermissionsGuard } from "./permissions.guard";
import { PermissionsService } from "./permissions.service";

@Module({
  imports: [PrismaModule],
  providers: [PermissionsService, PermissionsGuard],
  exports: [PermissionsService, PermissionsGuard],
})
export class PermissionsModule {}
