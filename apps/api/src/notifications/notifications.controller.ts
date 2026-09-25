import { Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentActor, PermissionsGuard, RequirePermission } from "../permissions";
import type { RequestActor } from "../permissions";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentActor() actor: RequestActor) {
    return this.notifications.listForUser(actor);
  }

  @Get("unread-count")
  async unreadCount(@CurrentActor() actor: RequestActor) {
    return { count: await this.notifications.unreadCount(actor) };
  }

  @Patch(":id/read")
  markRead(@Param("id") id: string, @CurrentActor() actor: RequestActor) {
    return this.notifications.markRead(id, actor);
  }

  @Post("read-all")
  markAllRead(@CurrentActor() actor: RequestActor) {
    return this.notifications.markAllRead(actor);
  }

  @Post("run-due-check")
  @RequirePermission("notifications.collections")
  runDueCheck() {
    return this.notifications.runDueCheck();
  }
}
