import { MESSAGES } from "@comms-crm-core/validation";
import { Type } from "class-transformer";
import { IsEmail, IsNotEmpty, IsOptional, IsString, ValidateNested } from "class-validator";
import { IsCpfCnpj, IsPhone } from "../../validation/decorators";
import { ToDigits, ToEmail } from "../../validation/transforms";
import { AddressInputDto } from "./address-input.dto";

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ToDigits()
  @IsNotEmpty()
  @IsCpfCnpj()
  cpfCnpj!: string;

  @IsOptional()
  @IsString()
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
