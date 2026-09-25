import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from "class-validator";

export class CreatePlanDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  typeId!: string;

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
