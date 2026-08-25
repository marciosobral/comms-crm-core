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
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const jwtUser = req.user as { id: string } | undefined;
    if (!jwtUser) {
      throw new AppException(ErrorCode.UNAUTHORIZED, "Não autenticado", HttpStatus.UNAUTHORIZED);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: jwtUser.id },
      include: { role: true },
    });
    if (!user) {
      throw new AppException(ErrorCode.UNAUTHORIZED, "Não autenticado", HttpStatus.UNAUTHORIZED);
    }

    this.permissions.check(user, required);
    return true;
  }
}
