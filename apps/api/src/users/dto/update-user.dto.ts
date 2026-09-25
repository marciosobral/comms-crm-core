import { MESSAGES } from "@comms-crm-core/validation";
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { IsCpf, IsPhone } from "../../validation/decorators";
import { ToDigits, ToEmail, ToNullableTrimmed } from "../../validation/transforms";

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @ToEmail()
  @IsEmail({}, { message: MESSAGES.email })
  email?: string;

  @IsOptional()
  @ToDigits()
  @IsCpf()
  cpf?: string;

  @IsOptional()
  @ToDigits()
  @IsPhone()
  phone?: string;

  @IsOptional()
  @IsString()
  roleId?: string;

  @IsOptional()
  @ToNullableTrimmed()
  @IsString()
  @MaxLength(50, { message: "Matrícula deve ter até 50 caracteres" })
  externalReference?: string | null;
}
