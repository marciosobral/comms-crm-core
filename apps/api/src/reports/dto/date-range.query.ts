import { DATE_ONLY_PATTERN, SALE_DATE_BY, type SaleDateBy } from "@comms-crm-core/validation";
import { IsDateString, IsIn, IsOptional, Matches } from "class-validator";

export class DateRangeQuery {
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
}
