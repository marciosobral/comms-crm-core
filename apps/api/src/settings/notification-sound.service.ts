import { AuditContext } from "@/audit/audit-context.decorator";
import { AuditService } from "@/audit/audit.service";
import { megabytes } from "@/common/sizes";
import { AppException } from "@/logging/app-exception";
import { ErrorCode } from "@/logging/error-codes";
import { PrismaService } from "@/prisma";
import { Injectable } from "@nestjs/common";

export const NOTIFICATION_SOUND_MAX_MB = 1;

const SOUND_MIMES = ["audio/mpeg", "audio/ogg", "audio/wav", "audio/x-wav", "audio/wave"];
const SOUND_ID = 1;
const SOUND_SETTING_KEY = "NOTIFICATION_SOUND";

const SOUND_METADATA = { fileName: true, mime: true, size: true, updatedAt: true } as const;

export interface UploadedSound {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class NotificationSoundService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  metadata() {
    return this.prisma.notificationSound.findUnique({
      where: { id: SOUND_ID },
      select: SOUND_METADATA,
    });
  }

  async file() {
    const sound = await this.prisma.notificationSound.findUnique({ where: { id: SOUND_ID } });
    if (!sound) {
      throw new AppException(ErrorCode.NOTIFICATION_SOUND_NOT_FOUND);
    }
    return sound;
  }

  async save(file: UploadedSound | undefined, ctx: AuditContext) {
    if (!file) {
      throw new AppException(ErrorCode.NOTIFICATION_SOUND_REQUIRED);
    }
    if (!SOUND_MIMES.includes(file.mimetype)) {
      throw new AppException(ErrorCode.NOTIFICATION_SOUND_TYPE_INVALID);
    }
    if (file.size > megabytes(NOTIFICATION_SOUND_MAX_MB)) {
      throw new AppException(ErrorCode.NOTIFICATION_SOUND_TOO_LARGE, {
        message: `Arquivo excede o limite de ${NOTIFICATION_SOUND_MAX_MB} MB`,
      });
    }

    const before = await this.metadata();
    const data = {
      fileName: file.originalname,
      mime: file.mimetype,
      size: file.size,
      data: new Uint8Array(file.buffer),
    };
    const after = await this.prisma.notificationSound.upsert({
      where: { id: SOUND_ID },
      update: data,
      create: { id: SOUND_ID, ...data },
      select: SOUND_METADATA,
    });
    await this.audit.record({
      entity: "SystemSetting",
      entityId: SOUND_SETTING_KEY,
      action: before ? "UPDATE" : "CREATE",
      ctx,
      before: before ?? undefined,
      after,
    });
    return after;
  }

  async remove(ctx: AuditContext): Promise<void> {
    const before = await this.metadata();
    if (!before) return;
    await this.prisma.notificationSound.delete({ where: { id: SOUND_ID } });
    await this.audit.record({
      entity: "SystemSetting",
      entityId: SOUND_SETTING_KEY,
      action: "DELETE",
      ctx,
      before,
    });
  }
}
