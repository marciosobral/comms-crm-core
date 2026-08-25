import { join } from "node:path";
import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { type AuditContext, AuditCtx } from "../audit/audit-context.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../permissions/permissions.guard";
import { RequirePermission } from "../permissions/require-permission.decorator";
import { SalesService } from "../sales/sales.service";
import { AttachmentsService } from "./attachments.service";

interface AuthedRequest {
  user: { id: string };
}

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AttachmentsController {
  constructor(
    private readonly attachments: AttachmentsService,
    private readonly sales: SalesService,
  ) {}

  @Post("sales/:saleId/attachments")
  @RequirePermission("sales.edit")
  @UseInterceptors(
    FileInterceptor("file", { dest: join(process.env.UPLOAD_DIR ?? "./uploads", "tmp") }),
  )
  async upload(
    @Param("saleId") saleId: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: AuthedRequest,
    @AuditCtx() ctx: AuditContext,
  ) {
    const actor = await this.sales.getActor(req.user.id);
    return this.attachments.upload(saleId, file, actor, ctx);
  }

  @Get("attachments/:id")
  async download(
    @Param("id") id: string,
    @Request() req: AuthedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const actor = await this.sales.getActor(req.user.id);
    const { file, mime, fileName } = await this.attachments.download(id, actor);
    res.setHeader("Content-Type", mime);
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(fileName)}"`);
    return file;
  }

  @Delete("attachments/:id")
  @RequirePermission("sales.edit")
  async remove(
    @Param("id") id: string,
    @Request() req: AuthedRequest,
    @AuditCtx() ctx: AuditContext,
  ) {
    const actor = await this.sales.getActor(req.user.id);
    return this.attachments.remove(id, actor, ctx);
  }
}
