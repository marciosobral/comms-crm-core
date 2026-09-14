import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { MESSAGES } from "@comms-core/validation";
import { IsCpfCnpj, IsPhone, IsUf } from "../../validation/decorators";
import { ToDigits, ToEmail, ToUf } from "../../validation/transforms";

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

  @IsOptional()
  @IsString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  motherName?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @ToUf()
  @IsUf()
  state?: string;

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
}
