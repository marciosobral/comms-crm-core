import { readFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Type } from "class-transformer";
import { IsInt, Max, Min } from "class-validator";
import { type AuditContext, AuditCtx } from "../audit/audit-context.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AppException } from "../logging/app-exception";
import { ErrorCode } from "../logging/error-codes";
import { PermissionsGuard } from "../permissions/permissions.guard";
import { RequirePermission } from "../permissions/require-permission.decorator";
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
    FileInterceptor("file", { dest: join(process.env.UPLOAD_DIR ?? "./uploads", "tmp") }),
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
