import { JwtAuthGuard } from "@/auth/jwt-auth.guard";
import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { DomainType } from "@prisma-client";
import { IsEnum } from "class-validator";
import { DomainValuesService } from "./domain-values.service";

class PublicDomainValuesQuery {
  @IsEnum(DomainType)
  type!: DomainType;
}

@Controller("domain-values")
@UseGuards(JwtAuthGuard)
export class DomainValuesPublicController {
  constructor(private readonly domainValues: DomainValuesService) {}

  @Get()
  list(@Query() query: PublicDomainValuesQuery) {
    return this.domainValues.listActive(query.type);
  }
}
