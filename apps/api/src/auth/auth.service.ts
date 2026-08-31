import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import type { User } from "../../prisma/generated/prisma/client/client";
import type { Env } from "../config";
import { WinstonLoggerService } from "../logging/winston-logger.service";
import { PrismaService } from "../prisma";
import { buildIdentifierWhere } from "./identifier";

interface TokenPayload {
  sub: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly logger: WinstonLoggerService,
  ) {}

  async login(identifier: string, password: string): Promise<AuthTokens> {
    const user = await this.findUserByIdentifier(identifier);
    if (!user?.credential) {
      throw new UnauthorizedException("Credenciais inválidas");
    }

    this.validateUserStatus(user);

    const valid = await argon2.verify(user.credential.passwordHash, password);
    if (!valid) {
      throw new UnauthorizedException("Credenciais inválidas");
    }

    this.stampLastLoginAt(user.id);

    return this.generateTokens(user);
  }

  private stampLastLoginAt(userId: string): void {
    this.prisma.user
      .update({ where: { id: userId }, data: { lastLoginAt: new Date() } })
      .catch((err: unknown) => {
        this.logger.error(
          `falha ao atualizar lastLoginAt: ${String(err)}`,
          undefined,
          AuthService.name,
        );
      });
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const payload = await this.verifyRefreshToken(refreshToken);

    const credential = await this.prisma.credential.findUnique({
      where: { userId: payload.sub },
      include: { user: true },
    });

    if (!credential?.refreshToken) {
      throw new UnauthorizedException("Token inválido");
    }

    const tokenMatch = await argon2.verify(credential.refreshToken, refreshToken);
    if (!tokenMatch) {
      throw new UnauthorizedException("Token inválido");
    }

    if (credential.refreshTokenExpiresAt && credential.refreshTokenExpiresAt < new Date()) {
      throw new UnauthorizedException("Token expirado");
    }

    this.validateUserStatus(credential.user);

    return this.generateTokens(credential.user);
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.credential.update({
      where: { userId },
      data: { refreshToken: null, refreshTokenExpiresAt: null },
    });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      omit: { deletedAt: true, deletedBy: true },
      include: { role: true },
    });
    const { role, ...rest } = user;
    return {
      ...rest,
      roleName: role?.name ?? null,
      permissions: user.isSuperAdmin ? ["*"] : (role?.permissions ?? []),
    };
  }

  private async findUserByIdentifier(identifier: string) {
    const where = buildIdentifierWhere(identifier);

    if ("cpf" in where) {
      const digits = identifier.replace(/\D/g, "");
      const masked = digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
      return this.prisma.user.findFirst({
        where: { OR: [{ cpf: identifier }, { cpf: digits }, { cpf: masked }] },
        include: { credential: true },
      });
    }

    return this.prisma.user.findFirst({ where, include: { credential: true } });
  }

  private validateUserStatus(user: User): void {
    const messages: Record<string, string> = {
      PENDING: "Conta pendente de aprovação",
      BLOCKED: "Conta bloqueada",
      INACTIVE: "Conta inativa",
      DELETED: "Conta não encontrada",
    };
    if (user.status !== "ACTIVE") {
      throw new UnauthorizedException(messages[user.status] ?? "Credenciais inválidas");
    }
  }

  private async generateTokens(user: User): Promise<AuthTokens> {
    const payload: TokenPayload = { sub: user.id };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload),
      this.jwt.signAsync(payload, {
        secret: this.config.get("JWT_REFRESH_SECRET"),
        expiresIn: this.config.get("JWT_REFRESH_EXPIRES_IN"),
      }),
    ]);

    const refreshTokenHash = await argon2.hash(refreshToken);
    const expiresIn = this.config.get("JWT_REFRESH_EXPIRES_IN");
    const ms = this.parseDuration(expiresIn);

    await this.prisma.credential.update({
      where: { userId: user.id },
      data: {
        refreshToken: refreshTokenHash,
        refreshTokenExpiresAt: new Date(Date.now() + ms),
      },
    });

    return { accessToken, refreshToken };
  }

  private async verifyRefreshToken(token: string): Promise<TokenPayload> {
    try {
      return await this.jwt.verifyAsync<TokenPayload>(token, {
        secret: this.config.get("JWT_REFRESH_SECRET"),
      });
    } catch {
      throw new UnauthorizedException("Token inválido");
    }
  }

  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000;
    const [, value, unit] = match;
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return Number(value) * multipliers[unit];
  }
}
