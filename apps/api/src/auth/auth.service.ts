import { randomUUID } from "node:crypto";
import type { Env } from "@/config";
import { WinstonLoggerService } from "@/logging/winston-logger.service";
import { PrismaService } from "@/prisma";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { User } from "@prisma-client";
import * as argon2 from "argon2";
import { buildIdentifierWhere } from "./identifier";

interface TokenPayload {
  sub: string;
  sid: string;
}

export interface SessionClient {
  ip: string | null;
  userAgent: string | null;
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

  async login(identifier: string, password: string, client: SessionClient): Promise<AuthTokens> {
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
    await this.prisma.session.deleteMany({
      where: { userId: user.id, expiresAt: { lt: new Date() } },
    });

    return this.startSession(user, client);
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
    if (!payload.sid) {
      throw new UnauthorizedException("Token inválido");
    }

    const session = await this.prisma.session.findUnique({
      where: { id: payload.sid },
      include: { user: true },
    });
    if (!session || session.userId !== payload.sub) {
      throw new UnauthorizedException("Token inválido");
    }
    if (session.expiresAt < new Date()) {
      await this.prisma.session.delete({ where: { id: session.id } });
      throw new UnauthorizedException("Token expirado");
    }
    const tokenMatch = await argon2.verify(session.refreshTokenHash, refreshToken);
    if (!tokenMatch) {
      throw new UnauthorizedException("Token inválido");
    }

    this.validateUserStatus(session.user);

    return this.rotateSession(session.user, session.id);
  }

  async logout(userId: string, sessionId: string | undefined): Promise<void> {
    if (!sessionId) return;
    await this.prisma.session.deleteMany({ where: { id: sessionId, userId } });
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

  private async startSession(user: User, client: SessionClient): Promise<AuthTokens> {
    const sessionId = randomUUID();
    const { tokens, refreshTokenHash, expiresAt } = await this.issueTokens(user, sessionId);
    await this.prisma.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        refreshTokenHash,
        expiresAt,
        ip: client.ip,
        userAgent: client.userAgent,
      },
    });
    return tokens;
  }

  private async rotateSession(user: User, sessionId: string): Promise<AuthTokens> {
    const { tokens, refreshTokenHash, expiresAt } = await this.issueTokens(user, sessionId);
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { refreshTokenHash, expiresAt, lastUsedAt: new Date() },
    });
    return tokens;
  }

  private async issueTokens(user: User, sessionId: string) {
    const payload: TokenPayload = { sub: user.id, sid: sessionId };
    const expiresIn = this.config.get("JWT_REFRESH_EXPIRES_IN");

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload),
      this.jwt.signAsync(payload, {
        secret: this.config.get("JWT_REFRESH_SECRET"),
        expiresIn,
      }),
    ]);

    return {
      tokens: { accessToken, refreshToken },
      refreshTokenHash: await argon2.hash(refreshToken),
      expiresAt: new Date(Date.now() + this.parseDuration(expiresIn)),
    };
  }

  // Tokens issued before per-device sessions carry no sid.
  private async verifyRefreshToken(token: string): Promise<Partial<TokenPayload>> {
    try {
      return await this.jwt.verifyAsync<Partial<TokenPayload>>(token, {
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
