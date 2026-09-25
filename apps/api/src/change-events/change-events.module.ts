import { Module } from "@nestjs/common";
import { PermissionsModule } from "../permissions";
import { PrismaModule } from "../prisma";
import { ChangeEventsController } from "./change-events.controller";
import { ChangeEventsService } from "./change-events.service";

@Module({
  imports: [PrismaModule, PermissionsModule],
  controllers: [ChangeEventsController],
  providers: [ChangeEventsService],
  exports: [ChangeEventsService],
})
export class ChangeEventsModule {}
