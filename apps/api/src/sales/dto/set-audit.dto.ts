import { IsBoolean } from "class-validator";

export class SetSaleAuditDto {
  @IsBoolean()
  ok!: boolean;
}
