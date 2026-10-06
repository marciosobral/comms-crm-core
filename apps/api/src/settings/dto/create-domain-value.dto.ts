import { DomainType } from "@prisma-client";
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateDomainValueDto {
  @IsEnum(DomainType)
  type!: (typeof DomainType)[keyof typeof DomainType];

  @IsString()
  @IsNotEmpty()
  value!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
