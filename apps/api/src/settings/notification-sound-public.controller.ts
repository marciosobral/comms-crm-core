import { JwtAuthGuard } from "@/auth/jwt-auth.guard";
import { Controller, Get, StreamableFile, UseGuards } from "@nestjs/common";
import { NotificationSoundService } from "./notification-sound.service";

@Controller("notification-sound")
@UseGuards(JwtAuthGuard)
export class NotificationSoundPublicController {
  constructor(private readonly notificationSound: NotificationSoundService) {}

  @Get()
  async file() {
    const sound = await this.notificationSound.file();
    return new StreamableFile(sound.data, { type: sound.mime });
  }
}
