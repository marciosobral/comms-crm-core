import { DomainType } from "@prisma-client";
import { ArrayMinSize, IsArray, IsEnum, IsString } from "class-validator";

export class ReorderDomainValuesDto {
  @IsEnum(DomainType)
  type!: (typeof DomainType)[keyof typeof DomainType];

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  ids!: string[];
}
