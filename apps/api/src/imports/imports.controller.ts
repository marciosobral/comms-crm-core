import { readFile, unlink } from "node:fs/promises";
import { type AuditContext, AuditCtx } from "@/audit/audit-context.decorator";
import { JwtAuthGuard } from "@/auth/jwt-auth.guard";
import { megabytes } from "@/common/sizes";
import { UploadTooLargeFilter } from "@/common/upload-too-large.filter";
import { uploadTmpDir } from "@/config";
import { AppException } from "@/logging/app-exception";
import { ErrorCode } from "@/logging/error-codes";
import { PermissionsGuard } from "@/permissions/permissions.guard";
import { RequirePermission } from "@/permissions/require-permission.decorator";
import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { CreateMappingDto, ListImportRowsQuery } from "./dto";
import { templateCsv } from "./import-csv";
import { ImportsService } from "./imports.service";
import { MappingsService } from "./mappings.service";

const IMPORT_MAX_MB = 20;

@Controller("imports")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission("imports.run")
export class ImportsController {
  constructor(
    private readonly imports: ImportsService,
    private readonly mappings: MappingsService,
  ) {}

  @Post()
  @UseInterceptors(
    FileInterceptor("file", {
      dest: uploadTmpDir(),
      limits: { fileSize: megabytes(IMPORT_MAX_MB), files: 1 },
    }),
  )
  @UseFilters(
    new UploadTooLargeFilter(
      ErrorCode.IMPORT_FILE_TOO_LARGE,
      `Planilha excede o limite de ${IMPORT_MAX_MB} MB`,
    ),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @AuditCtx() ctx: AuditContext,
  ) {
    if (!file) {
      throw new AppException(ErrorCode.IMPORT_FILE_REQUIRED);
    }
    const buffer = await readFile(file.path);
    await unlink(file.path).catch(() => undefined);
    return this.imports.runImport(buffer, file.originalname, ctx);
  }

  @Get()
  list() {
    return this.imports.listBatches();
  }

  @Get("mappings")
  listMappings() {
    return this.mappings.list();
  }

  @Post("mappings")
  createMapping(@Body() dto: CreateMappingDto, @AuditCtx() ctx: AuditContext) {
    return this.mappings.create(dto, ctx);
  }

  @Delete("mappings/:id")
  removeMapping(@Param("id") id: string, @AuditCtx() ctx: AuditContext) {
    return this.mappings.remove(id, ctx);
  }

  @Get("template.csv")
  @Header("Content-Type", "text/csv; charset=utf-8")
  @Header("Content-Disposition", 'attachment; filename="modelo-importacao.csv"')
  template() {
    return templateCsv();
  }

  @Get(":id")
  getBatch(@Param("id") id: string) {
    return this.imports.getBatch(id);
  }

  @Get(":id/rows")
  listRows(@Param("id") id: string, @Query() query: ListImportRowsQuery) {
    return this.imports.listRows(id, query);
  }

  @Get(":id/unresolved")
  unresolved(@Param("id") id: string) {
    return this.imports.unresolved(id);
  }

  @Get(":id/pending.csv")
  async pendingCsv(@Param("id") id: string, @Res({ passthrough: true }) res: Response) {
    const { fileName, csv } = await this.imports.pendingCsvFile(id);
    const asciiName = `pendencias-${fileName}`.replace(/[^\w.-]/g, "_");
    const encodedName = encodeURIComponent(`pendencias-${fileName}.csv`).replace(
      /['()*]/g,
      (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
    );
    res.set({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${asciiName}.csv"; filename*=UTF-8''${encodedName}`,
    });
    return csv;
  }

  @Post(":id/reprocess")
  reprocess(@Param("id") id: string, @AuditCtx() ctx: AuditContext) {
    return this.imports.reprocess(id, ctx);
  }
}
