import { MESSAGES } from "@comms-crm-core/validation";
import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from "class-validator";
import { IsCpf, IsPhone } from "../../validation/decorators";
import { ToDigits, ToEmail } from "../../validation/transforms";

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ToEmail()
  @IsEmail({}, { message: MESSAGES.email })
  email!: string;

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
  @Matches(/^\d{1,4}$/, { message: "Referência deve ter até 4 dígitos" })
  reference?: string;

  @IsString()
  @MinLength(8, { message: MESSAGES.password })
  password!: string;
}
