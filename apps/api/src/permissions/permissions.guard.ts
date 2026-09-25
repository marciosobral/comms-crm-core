import { CanActivate, ExecutionContext, HttpStatus, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { AppException } from "../logging/app-exception";
import { ErrorCode } from "../logging/error-codes";
import { PrismaService } from "../prisma";
import { PermissionKey } from "./permission-catalog";
import { PermissionsService } from "./permissions.service";
import { PERMISSIONS_METADATA_KEY } from "./require-permission.decorator";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<PermissionKey[] | undefined>(
      PERMISSIONS_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    const req = context.switchToHttp().getRequest<Request>();
    if (!req.user) {
      throw new AppException(ErrorCode.UNAUTHORIZED, "Não autenticado", HttpStatus.UNAUTHORIZED);
    }

    const actor = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      include: { role: true },
    });
    if (!actor) {
      throw new AppException(ErrorCode.UNAUTHORIZED, "Não autenticado", HttpStatus.UNAUTHORIZED);
    }
    if (actor.status !== "ACTIVE") {
      throw new AppException(ErrorCode.USER_INACTIVE, "Conta inativa", HttpStatus.FORBIDDEN);
    }
    req.actor = actor;

    if (required && required.length > 0) {
      this.permissions.check(actor, required);
    }
    return true;
  }
}
