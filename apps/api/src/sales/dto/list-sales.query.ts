import { DATE_ONLY_PATTERN } from "@comms-crm-core/validation";
import { Type } from "class-transformer";
import { IsDateString, IsInt, IsOptional, IsPositive, IsString, Matches } from "class-validator";

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
