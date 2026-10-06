import { ImportRowStatus } from "@prisma-client";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsPositive, Max } from "class-validator";

export const IMPORT_ROWS_DEFAULT_PER_PAGE = 50;
export const IMPORT_ROWS_MAX_PER_PAGE = 200;

export class ListImportRowsQuery {
  @IsOptional()
  @IsEnum(ImportRowStatus, { message: "Status inválido" })
  status?: ImportRowStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(IMPORT_ROWS_MAX_PER_PAGE)
  perPage?: number;
}
