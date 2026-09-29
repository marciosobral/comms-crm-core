import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { type AuditContext, AuditCtx } from "../audit/audit-context.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { UploadTooLargeFilter } from "../common/upload-too-large.filter";
import { uploadTmpDir } from "../config";
import { ErrorCode } from "../logging/error-codes";
import { CurrentActor } from "../permissions/current-actor.decorator";
import { PermissionsGuard } from "../permissions/permissions.guard";
import type { RequestActor } from "../permissions/request-actor";
import { RequirePermission } from "../permissions/require-permission.decorator";
import { UPLOAD_MAX_MB_LIMIT } from "../settings/system-settings.service";
import { AttachmentsService } from "./attachments.service";
import { UploadAttachmentDto } from "./dto/upload-attachment.dto";

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AttachmentsController {
  constructor(private readonly attachments: AttachmentsService) {}

  @Post("sales/:saleId/attachments")
  @UseInterceptors(
    FileInterceptor("file", {
      dest: uploadTmpDir(),
      limits: { fileSize: UPLOAD_MAX_MB_LIMIT * 1024 * 1024, files: 1 },
    }),
  )
  @UseFilters(
    new UploadTooLargeFilter(
      ErrorCode.ATTACHMENT_TOO_LARGE,
      `Arquivo excede o limite de ${UPLOAD_MAX_MB_LIMIT} MB`,
    ),
  )
  async upload(
    @Param("saleId") saleId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadAttachmentDto,
    @CurrentActor() actor: RequestActor,
    @AuditCtx() ctx: AuditContext,
  ) {
    return this.attachments.upload(saleId, file, dto.kind ?? "OTHER", actor, ctx);
  }

  @Get("attachments/:id")
  async download(
    @Param("id") id: string,
    @CurrentActor() actor: RequestActor,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { file, mime, fileName } = await this.attachments.download(id, actor);
    res.setHeader("Content-Type", mime);
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(fileName)}"`);
    return file;
  }

  @Delete("attachments/:id")
  @RequirePermission("sales.edit")
  async remove(
    @Param("id") id: string,
    @CurrentActor() actor: RequestActor,
    @AuditCtx() ctx: AuditContext,
  ) {
    return this.attachments.remove(id, actor, ctx);
  }
}
