import { IsEnum, IsOptional } from "class-validator";
import { DomainType } from "../../../prisma/generated/prisma/client/client";

export class ListDomainValuesQuery {
  @IsOptional()
  @IsEnum(DomainType)
  type?: (typeof DomainType)[keyof typeof DomainType];
}
