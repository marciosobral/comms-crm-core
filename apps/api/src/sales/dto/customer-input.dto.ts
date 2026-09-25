import { MESSAGES } from "@comms-crm-core/validation";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { AddressInputDto } from "../../customers/dto/address-input.dto";
import { IsCpfCnpj, IsPhone } from "../../validation/decorators";
import { ToDigits, ToEmail, ToTrimmed } from "../../validation/transforms";

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

  @ValidateIf((input: CustomerInputDto) => !input.id)
  @IsNotEmpty({ message: "Informe a data de nascimento" })
  @IsDateString({ strict: true }, { message: "Data de nascimento inválida" })
  birthDate?: string;

  @ValidateIf((input: CustomerInputDto) => !input.id)
  @ToTrimmed()
  @IsNotEmpty({ message: "Informe o nome da mãe" })
  @IsString()
  motherName?: string;

  @ValidateIf((input: CustomerInputDto) => !input.id)
  @ToEmail()
  @IsNotEmpty({ message: "Informe o e-mail" })
  @IsEmail({}, { message: MESSAGES.email })
  email?: string;

  @ValidateIf((input: CustomerInputDto) => !input.id)
  @ToDigits()
  @IsNotEmpty({ message: "Informe o contato 1" })
  @IsPhone()
  phone1?: string;

  @ValidateIf((input: CustomerInputDto) => !input.id)
  @ToDigits()
  @IsNotEmpty({ message: "Informe o contato 2" })
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
