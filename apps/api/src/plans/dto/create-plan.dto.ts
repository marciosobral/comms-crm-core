import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from "class-validator";
import { PlanType } from "../../../prisma/generated/prisma/client/client";

export class CreatePlanDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(PlanType)
  type!: PlanType;

  @IsOptional()
  @IsString()
  speed?: string;

  @IsArray()
  @IsString({ each: true })
  features!: string[];

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  basePrice!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  minPrice!: number;

  @IsOptional()
  @IsString()
  salesScript?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
