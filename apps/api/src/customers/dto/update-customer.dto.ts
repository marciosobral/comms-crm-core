import { IsCpfCnpj, IsPhone } from "@/validation/decorators";
import { ToDigits, ToEmail } from "@/validation/transforms";
import { DATE_ONLY_PATTERN, MESSAGES } from "@comms-crm-core/validation";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { AddressInputDto } from "./address-input.dto";

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsNotEmpty()
  @ToDigits()
  @IsCpfCnpj()
  cpfCnpj?: string;

  @ValidateIf((_, value) => value !== null && value !== undefined && value !== "")
  @IsString()
  @Matches(DATE_ONLY_PATTERN, { message: "Data inválida" })
  @IsDateString({ strict: true }, { message: "Data inválida" })
  birthDate?: string;

  @IsOptional()
  @IsString()
  motherName?: string;

  @IsOptional()
  @ToEmail()
  @IsEmail({}, { message: MESSAGES.email })
  email?: string;

  @IsOptional()
  @ToDigits()
  @IsPhone()
  phone1?: string;

  @IsOptional()
  @ToDigits()
  @IsPhone()
  phone2?: string;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AddressInputDto)
  addresses?: AddressInputDto[];
}
