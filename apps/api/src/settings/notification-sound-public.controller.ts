import { JwtAuthGuard } from "@/auth/jwt-auth.guard";
import { Controller, Get, HttpStatus, Res, StreamableFile, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { NotificationSoundService } from "./notification-sound.service";

@Controller("notification-sound")
@UseGuards(JwtAuthGuard)
export class NotificationSoundPublicController {
  constructor(private readonly notificationSound: NotificationSoundService) {}

  // No sound is a normal state (notifications arrive silently), so it answers 204 instead of 404.
  @Get()
  async file(@Res({ passthrough: true }) res: Response) {
    const sound = await this.notificationSound.file();
    if (!sound) {
      res.status(HttpStatus.NO_CONTENT);
      return;
    }
    return new StreamableFile(sound.data, { type: sound.mime });
  }
}
