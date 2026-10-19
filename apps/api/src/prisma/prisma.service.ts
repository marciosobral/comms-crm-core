import { currentSandboxId } from "@/common/sandbox-context";
import type { Env } from "@/config";
import { AppException } from "@/logging/app-exception";
import { ErrorCode } from "@/logging/error-codes";
import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaClient } from "@prisma-client";
import { PrismaPg } from "@prisma/adapter-pg";
import { SandboxRegistry } from "./sandbox-registry";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly isDemo: boolean;

  constructor(config: ConfigService<Env, true>, sandboxes: SandboxRegistry) {
    const adapter = new PrismaPg({ connectionString: config.get("DATABASE_URL") });
    super({ adapter });
    this.isDemo = config.get("DEMO_MODE");
    // biome-ignore lint/correctness/noConstructorReturn: the proxy must replace the instance Nest injects
    if (this.isDemo) return routeToSandbox(this, sandboxes);
  }

  async onModuleInit() {
    // In demo mode the base database only feeds the template, and an open connection would
    // block cloning it.
    if (!this.isDemo) await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

// Services keep injecting PrismaService; in demo mode every property is read from the database
// of the sandbox the current request belongs to.
function routeToSandbox(base: PrismaService, sandboxes: SandboxRegistry): PrismaService {
  return new Proxy(base, {
    get(target, property) {
      const sandboxId = currentSandboxId();
      const client = sandboxId === undefined ? target : sandboxes.client(sandboxId);
      if (!client) throw new AppException(ErrorCode.DEMO_SESSION_EXPIRED);
      const value: unknown = Reflect.get(client, property);
      return typeof value === "function" ? value.bind(client) : value;
    },
  });
}
