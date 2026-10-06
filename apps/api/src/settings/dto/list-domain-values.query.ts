import { DomainType } from "@prisma-client";
import { IsEnum, IsOptional } from "class-validator";

export class ListDomainValuesQuery {
  @IsOptional()
  @IsEnum(DomainType)
  type?: (typeof DomainType)[keyof typeof DomainType];
}
