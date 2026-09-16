import { MESSAGES } from "@comms-core/validation";
import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { IsCpf, IsPhone } from "../../validation/decorators";
import { ToDigits, ToEmail } from "../../validation/transforms";

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
}
