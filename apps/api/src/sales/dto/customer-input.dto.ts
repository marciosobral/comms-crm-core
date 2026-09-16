import { MESSAGES } from "@comms-core/validation";
import { Type } from "class-transformer";
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { AddressInputDto } from "../../customers/dto/address-input.dto";
import { IsCpfCnpj, IsPhone } from "../../validation/decorators";
import { ToDigits, ToEmail } from "../../validation/transforms";

export class CustomerInputDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @ValidateIf((input: CustomerInputDto) => !input.id)
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
  @IsString()
  customerAddressId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressInputDto)
  address?: AddressInputDto;
}
