import { Type } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { BankAccountType } from "../../../prisma/generated/prisma/client/client";
import { ToDigits } from "../../validation/transforms";
import { CustomerInputDto } from "./customer-input.dto";

export class CreateSaleDto {
  @ValidateNested()
  @Type(() => CustomerInputDto)
  customer!: CustomerInputDto;

  @IsOptional()
  @IsString()
  planId?: string | null;

  @IsString()
  @IsNotEmpty()
  statusId!: string;

  @IsOptional()
  @IsString()
  paymentMethodId?: string;

  @IsOptional()
  @IsString()
  systemId?: string;

  @IsOptional()
  @IsString()
  mailingId?: string;

  @IsOptional()
  @IsString()
  pdvId?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  qty?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(28)
  dueDay?: number;

  @IsString()
  @IsNotEmpty()
  date!: string;

  @IsOptional()
  @IsString()
  orderNumber?: string;

  @IsOptional()
  @IsString()
  login?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  auditNote?: string;

  @IsOptional()
  @IsString()
  scheduleDate?: string | null;

  @IsOptional()
  @IsString()
  schedulePeriodId?: string | null;

  @IsOptional()
  @IsString()
  installedAt?: string | null;

  @IsOptional()
  @IsBoolean()
  brscan?: boolean;

  @IsOptional()
  @ToDigits()
  @IsString()
  bankAgency?: string;

  @IsOptional()
  @ToDigits()
  @IsString()
  bankAccount?: string;

  @IsOptional()
  @IsString()
  bankCode?: string;

  @IsOptional()
  @ToDigits()
  @IsString()
  bankAgencyDigit?: string;

  @IsOptional()
  @Matches(/^[0-9Xx]$/)
  bankAccountDigit?: string;

  @IsOptional()
  @IsEnum(BankAccountType)
  bankAccountType?: BankAccountType;

  @IsOptional()
  @IsBoolean()
  accountHolderIsCustomer?: boolean;

  @IsOptional()
  @IsString()
  accountHolderName?: string;

  @IsOptional()
  @ToDigits()
  @IsString()
  accountHolderCpf?: string;

  @IsOptional()
  @IsString()
  sellerId?: string;

  @IsOptional()
  @IsString()
  supervisorId?: string;

  @IsOptional()
  @IsString()
  bkoId?: string;

  @IsOptional()
  @IsString()
  auditorId?: string;
}
