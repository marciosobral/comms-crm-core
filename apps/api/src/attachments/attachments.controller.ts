import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { type AuditContext, AuditCtx } from "../audit/audit-context.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { uploadTmpDir } from "../config";
import { CurrentActor } from "../permissions/current-actor.decorator";
import { PermissionsGuard } from "../permissions/permissions.guard";
import type { RequestActor } from "../permissions/request-actor";
import { RequirePermission } from "../permissions/require-permission.decorator";
import { AttachmentsService } from "./attachments.service";
import { UploadAttachmentDto } from "./dto/upload-attachment.dto";

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AttachmentsController {
  constructor(private readonly attachments: AttachmentsService) {}

  @Post("sales/:saleId/attachments")
  @UseInterceptors(FileInterceptor("file", { dest: uploadTmpDir() }))
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
