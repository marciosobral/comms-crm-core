import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";
import { MESSAGES } from "@comms-core/validation";
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

  @IsString()
  @MinLength(8, { message: MESSAGES.password })
  password!: string;
}
