import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { DomainType } from "../../../prisma/generated/prisma/client/client";

export class CreateDomainValueDto {
  @IsEnum(DomainType)
  type!: (typeof DomainType)[keyof typeof DomainType];

  @IsString()
  @IsNotEmpty()
  value!: string;

  @IsOptional()
  @IsInt()
  order?: number;
}
