import { DATE_ONLY_PATTERN } from "@comms-crm-core/validation";
import { IsDateString, IsOptional, Matches } from "class-validator";

export class DateRangeQuery {
  @IsOptional()
  @Matches(DATE_ONLY_PATTERN, { message: "Data inválida" })
  @IsDateString({ strict: true }, { message: "Data inválida" })
  from?: string;

  @IsOptional()
  @Matches(DATE_ONLY_PATTERN, { message: "Data inválida" })
  @IsDateString({ strict: true }, { message: "Data inválida" })
  to?: string;
}
