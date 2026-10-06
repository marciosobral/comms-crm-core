import { readFile, unlink } from "node:fs/promises";
import { type AuditContext, AuditCtx } from "@/audit/audit-context.decorator";
import { JwtAuthGuard } from "@/auth/jwt-auth.guard";
import { UploadTooLargeFilter } from "@/common/upload-too-large.filter";
import { uploadTmpDir } from "@/config";
import { AppException } from "@/logging/app-exception";
import { ErrorCode } from "@/logging/error-codes";
import { PermissionsGuard } from "@/permissions/permissions.guard";
import { RequirePermission } from "@/permissions/require-permission.decorator";
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Type } from "class-transformer";
import { IsInt, Max, Min } from "class-validator";
import { CreateMappingDto } from "./dto";
import { ImportsService } from "./imports.service";
import { MappingsService } from "./mappings.service";

class UploadImportDto {
  @Type(() => Number)
  @IsInt({ message: "Informe o ano da planilha" })
  @Min(2020)
  @Max(2100)
  year!: number;
}

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
      limits: { fileSize: IMPORT_MAX_MB * 1024 * 1024, files: 1 },
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
    @Body() dto: UploadImportDto,
    @AuditCtx() ctx: AuditContext,
  ) {
    if (!file) {
      throw new AppException(ErrorCode.IMPORT_FILE_REQUIRED, "Envie o arquivo da planilha");
    }
    const buffer = await readFile(file.path);
    await unlink(file.path).catch(() => undefined);
    return this.imports.runImport(buffer, file.originalname, dto.year, ctx);
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

  @Get(":id")
  getBatch(@Param("id") id: string) {
    return this.imports.getBatch(id);
  }

  @Post(":id/reprocess")
  reprocess(@Param("id") id: string, @AuditCtx() ctx: AuditContext) {
    return this.imports.reprocess(id, ctx);
  }
}
