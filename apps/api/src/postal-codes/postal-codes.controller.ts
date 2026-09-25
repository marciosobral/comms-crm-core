import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { UserThrottlerGuard } from "../common/user-throttler.guard";
import { PermissionsGuard } from "../permissions/permissions.guard";
import { PostalCodesService } from "./postal-codes.service";

@Controller("postal-codes")
@UseGuards(JwtAuthGuard, PermissionsGuard, UserThrottlerGuard)
@Throttle({ default: { limit: 30, ttl: 60_000 } })
export class PostalCodesController {
  constructor(private readonly postalCodes: PostalCodesService) {}

  @Get(":cep")
  lookup(@Param("cep") cep: string) {
    return this.postalCodes.lookup(cep);
  }
}
