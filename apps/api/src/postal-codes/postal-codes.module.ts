import { Module } from "@nestjs/common";
import { LoggingModule } from "../logging";
import { PermissionsModule } from "../permissions";
import { PrismaModule } from "../prisma";
import { PostalCodesController } from "./postal-codes.controller";
import { PostalCodesService } from "./postal-codes.service";

@Module({
  imports: [LoggingModule, PrismaModule, PermissionsModule],
  controllers: [PostalCodesController],
  providers: [PostalCodesService],
})
export class PostalCodesModule {}
