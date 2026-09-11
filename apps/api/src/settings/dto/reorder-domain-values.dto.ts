import { ArrayMinSize, IsArray, IsEnum, IsString } from "class-validator";
import { DomainType } from "../../../prisma/generated/prisma/client/client";

export class ReorderDomainValuesDto {
  @IsEnum(DomainType)
  type!: (typeof DomainType)[keyof typeof DomainType];

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  ids!: string[];
}
