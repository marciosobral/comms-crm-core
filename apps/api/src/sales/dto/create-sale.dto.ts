import { ToDigits } from "@/validation/transforms";
import { DATE_ONLY_PATTERN } from "@comms-crm-core/validation";
import { BankAccountType } from "@prisma-client";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
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
  ValidateIf,
  ValidateNested,
} from "class-validator";
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

  @IsNotEmpty({ message: "Informe o dia de vencimento" })
  @Type(() => Number)
  @IsInt({ message: "O vencimento deve ser um dia entre 1 e 28" })
  @Min(1, { message: "O vencimento deve ser um dia entre 1 e 28" })
  @Max(28, { message: "O vencimento deve ser um dia entre 1 e 28" })
  dueDay!: number;

  @IsString()
  @IsNotEmpty()
  @Matches(DATE_ONLY_PATTERN, { message: "Data inválida" })
  @IsDateString({ strict: true }, { message: "Data inválida" })
  date!: string;

  @IsOptional()
  @IsString()
  orderNumber?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  auditNote?: string;

  @ValidateIf((_, value) => value !== null && value !== undefined && value !== "")
  @IsString()
  @Matches(DATE_ONLY_PATTERN, { message: "Data inválida" })
  @IsDateString({ strict: true }, { message: "Data inválida" })
  scheduleDate?: string | null;

  @IsOptional()
  @IsString()
  schedulePeriodId?: string | null;

  @ValidateIf((_, value) => value !== null && value !== undefined && value !== "")
  @IsString()
  @Matches(DATE_ONLY_PATTERN, { message: "Data inválida" })
  @IsDateString({ strict: true }, { message: "Data inválida" })
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
