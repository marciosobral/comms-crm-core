import { DomainType, ImportMappingKind } from "@prisma-client";
import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateMappingDto {
  @IsEnum(ImportMappingKind)
  kind!: ImportMappingKind;

  @IsOptional()
  @IsEnum(DomainType)
  domainType?: DomainType;

  @IsString()
  @IsNotEmpty()
  sourceValue!: string;

  @IsString()
  @IsNotEmpty()
  targetId!: string;
}
