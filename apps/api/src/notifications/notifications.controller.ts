import { Controller, Get, Param, Patch, Post, Request, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard, RequirePermission } from "../permissions";
import { NotificationsService } from "./notifications.service";

interface AuthedRequest {
  user: { id: string };
}

@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@Request() req: AuthedRequest) {
    return this.notifications.listForUser(req.user.id);
  }

  @Get("unread-count")
  async unreadCount(@Request() req: AuthedRequest) {
    return { count: await this.notifications.unreadCount(req.user.id) };
  }

  @Patch(":id/read")
  markRead(@Param("id") id: string, @Request() req: AuthedRequest) {
    return this.notifications.markRead(id, req.user.id);
  }

  @Post("read-all")
  markAllRead(@Request() req: AuthedRequest) {
    return this.notifications.markAllRead(req.user.id);
  }

  @Post("run-due-check")
  @UseGuards(PermissionsGuard)
  @RequirePermission("notifications.collections")
  runDueCheck() {
    return this.notifications.runDueCheck();
  }
}
