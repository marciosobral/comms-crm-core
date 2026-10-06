import { AuditModule } from "@/audit";
import { PermissionsModule } from "@/permissions";
import { PrismaModule } from "@/prisma";
import { Module } from "@nestjs/common";
import { CustomersController } from "./customers.controller";
import { CustomersService } from "./customers.service";

@Module({
  imports: [PrismaModule, PermissionsModule, AuditModule],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
