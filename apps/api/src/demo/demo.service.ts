import type { AuthTokens, SessionClient } from "@/auth/auth.service";
import { AuthService } from "@/auth/auth.service";
import { runInSandbox } from "@/common/sandbox-context";
import { AppException } from "@/logging/app-exception";
import { ErrorCode } from "@/logging/error-codes";
import { WinstonLoggerService } from "@/logging/winston-logger.service";
import { PrismaService, SandboxRegistry } from "@/prisma";
import { Injectable } from "@nestjs/common";
import { DEMO_PROFILES, type DemoProfileKey } from "./demo-profiles";

@Injectable()
export class DemoService {
  constructor(
    private readonly sandboxes: SandboxRegistry,
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
    private readonly logger: WinstonLoggerService,
  ) {}

  async login(profile: DemoProfileKey, client: SessionClient): Promise<AuthTokens> {
    const sandboxId = await this.createSandbox();
    return runInSandbox(sandboxId, () => this.startProfileSession(profile, client));
  }

  // Runs inside the caller's sandbox, so the new profile sees everything done so far.
  async switchProfile(
    profile: DemoProfileKey,
    current: { id: string; sessionId?: string },
    client: SessionClient,
  ): Promise<AuthTokens> {
    await this.auth.logout(current.id, current.sessionId);
    return this.startProfileSession(profile, client);
  }

  private async createSandbox(): Promise<string> {
    try {
      return await this.sandboxes.create();
    } catch (error) {
      if (error instanceof AppException) throw error;
      this.logger.error(
        `demo sandbox creation failed: ${String(error)}`,
        undefined,
        DemoService.name,
      );
      throw new AppException(ErrorCode.DEMO_UNAVAILABLE);
    }
  }

  private async startProfileSession(profile: DemoProfileKey, client: SessionClient) {
    const user = await this.prisma.user.findUnique({
      where: { email: DEMO_PROFILES[profile].email },
    });
    if (!user) throw new AppException(ErrorCode.DEMO_UNAVAILABLE);
    return this.auth.startSessionFor(user, client);
  }
}
