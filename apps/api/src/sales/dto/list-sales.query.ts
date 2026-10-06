import { DATE_ONLY_PATTERN, SALE_DATE_BY, type SaleDateBy } from "@comms-crm-core/validation";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
} from "class-validator";

export class ListSalesQuery {
  @IsOptional()
  @IsString()
  statusId?: string;

  @IsOptional()
  @IsString()
  sellerId?: string;

  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @Matches(DATE_ONLY_PATTERN, { message: "Data inválida" })
  @IsDateString({ strict: true }, { message: "Data inválida" })
  from?: string;

  @IsOptional()
  @Matches(DATE_ONLY_PATTERN, { message: "Data inválida" })
  @IsDateString({ strict: true }, { message: "Data inválida" })
  to?: string;

  @IsOptional()
  @IsIn(SALE_DATE_BY, { message: "Contagem inválida" })
  dateBy?: SaleDateBy;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  perPage?: number;
}
