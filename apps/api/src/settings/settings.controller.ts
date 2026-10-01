import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AuditContext, AuditCtx } from "../audit/audit-context.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { UploadTooLargeFilter } from "../common/upload-too-large.filter";
import { ErrorCode } from "../logging/error-codes";
import { PermissionsGuard } from "../permissions/permissions.guard";
import { RequirePermission } from "../permissions/require-permission.decorator";
import { DomainValuesService } from "./domain-values.service";
import {
  CreateDomainValueDto,
  ListDomainValuesQuery,
  ReorderDomainValuesDto,
  UpdateDomainValueDto,
  UpdateSettingDto,
} from "./dto";
import { NOTIFICATION_SOUND_MAX_MB, NotificationSoundService } from "./notification-sound.service";
import { SystemSettingsService } from "./system-settings.service";

@Controller("settings")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission("settings.manage")
export class SettingsController {
  constructor(
    private readonly domainValues: DomainValuesService,
    private readonly systemSettings: SystemSettingsService,
    private readonly notificationSound: NotificationSoundService,
  ) {}

  @Get("domain-values")
  listDomainValues(@Query() query: ListDomainValuesQuery) {
    return this.domainValues.list(query.type);
  }

  @Post("domain-values")
  createDomainValue(@Body() dto: CreateDomainValueDto, @AuditCtx() ctx: AuditContext) {
    return this.domainValues.create(dto, ctx);
  }

  @Patch("domain-values/reorder")
  @HttpCode(HttpStatus.NO_CONTENT)
  reorderDomainValues(@Body() dto: ReorderDomainValuesDto, @AuditCtx() ctx: AuditContext) {
    return this.domainValues.reorder(dto.type, dto.ids, ctx);
  }

  @Patch("domain-values/:id")
  updateDomainValue(
    @Param("id") id: string,
    @Body() dto: UpdateDomainValueDto,
    @AuditCtx() ctx: AuditContext,
  ) {
    return this.domainValues.update(id, dto, ctx);
  }

  @Get("system")
  listSystem() {
    return this.systemSettings.list();
  }

  @Patch("system/:key")
  updateSystem(
    @Param("key") key: string,
    @Body() dto: UpdateSettingDto,
    @AuditCtx() ctx: AuditContext,
  ) {
    return this.systemSettings.update(key, dto.value, ctx);
  }

  @Get("notification-sound")
  async notificationSoundMetadata() {
    return { sound: await this.notificationSound.metadata() };
  }

  // Memory storage on purpose: the sound is small and goes straight into the database.
  @Post("notification-sound")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: NOTIFICATION_SOUND_MAX_MB * 1024 * 1024, files: 1 },
    }),
  )
  @UseFilters(
    new UploadTooLargeFilter(
      ErrorCode.NOTIFICATION_SOUND_TOO_LARGE,
      `Arquivo excede o limite de ${NOTIFICATION_SOUND_MAX_MB} MB`,
    ),
  )
  saveNotificationSound(
    @UploadedFile() file: Express.Multer.File | undefined,
    @AuditCtx() ctx: AuditContext,
  ) {
    return this.notificationSound.save(file, ctx);
  }

  @Delete("notification-sound")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeNotificationSound(@AuditCtx() ctx: AuditContext) {
    return this.notificationSound.remove(ctx);
  }
}
