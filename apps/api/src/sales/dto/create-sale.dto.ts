import { Type } from "class-transformer";
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { ToDigits } from "../../validation/transforms";
import { CustomerInputDto } from "./customer-input.dto";

export class CreateSaleDto {
  @ValidateNested()
  @Type(() => CustomerInputDto)
  customer!: CustomerInputDto;

  @IsOptional()
  @IsString()
  fixedPlanId?: string;

  @IsOptional()
  @IsString()
  internetPlanId?: string;

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
  scheduleStart?: string;

  @IsOptional()
  @IsString()
  scheduleEnd?: string;

  @IsOptional()
  @IsString()
  installedAt?: string;

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
  bankName?: string;

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
