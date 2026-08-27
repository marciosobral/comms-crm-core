import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { DomainType, ImportMappingKind } from "../../../prisma/generated/prisma/client/client";

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
