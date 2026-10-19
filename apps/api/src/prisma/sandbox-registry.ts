import { readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import type { Env } from "@/config";
import { AppException } from "@/logging/app-exception";
import { ErrorCode } from "@/logging/error-codes";
import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { PrismaClient } from "@prisma-client";
import { DatabaseAdmin } from "./database-admin";
import { SandboxClientFactory } from "./sandbox-client-factory";
import {
  SANDBOX_DATABASE_PREFIX,
  TEMPLATE_DATABASE,
  isSandboxId,
  newSandboxId,
  sandboxDatabase,
} from "./sandbox-names";

export const MAX_SANDBOXES = 30;
export const SANDBOX_IDLE_MS = 2 * 60 * 60_000;

export const SANDBOX_MAX_LIFETIME_MS = 8 * 60 * 60_000;

interface Sandbox {
  client: PrismaClient;
  createdAt: number;
  lastSeenAt: number;
}

@Injectable()
export class SandboxRegistry implements OnModuleDestroy {
  private readonly sandboxes = new Map<string, Sandbox>();
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly admin: DatabaseAdmin,
    private readonly clients: SandboxClientFactory,
    private readonly config: ConfigService<Env, true>,
  ) {}

  // Database-level statements run one at a time: Postgres refuses to clone a template while
  // another statement is copying or replacing it.
  exclusive<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task, task);
    this.queue = run.catch(() => undefined);
    return run;
  }

  create(): Promise<string> {
    return this.exclusive(async () => {
      if (this.sandboxes.size >= MAX_SANDBOXES) {
        throw new AppException(ErrorCode.DEMO_FULL);
      }
      const sandboxId = newSandboxId();
      const database = sandboxDatabase(sandboxId);
      await this.admin.cloneDatabase(database, TEMPLATE_DATABASE);
      this.sandboxes.set(sandboxId, {
        client: this.clients.create(this.admin.urlFor(database)),
        createdAt: Date.now(),
        lastSeenAt: Date.now(),
      });
      return sandboxId;
    });
  }

  client(sandboxId: string): PrismaClient | undefined {
    const sandbox = this.sandboxes.get(sandboxId);
    if (sandbox) sandbox.lastSeenAt = Date.now();
    return sandbox?.client;
  }

  async dropExpired(now: number = Date.now()): Promise<number> {
    const expired = [...this.sandboxes]
      .filter(
        ([, sandbox]) =>
          now - sandbox.lastSeenAt > SANDBOX_IDLE_MS ||
          now - sandbox.createdAt > SANDBOX_MAX_LIFETIME_MS,
      )
      .map(([sandboxId]) => sandboxId);
    for (const sandboxId of expired) await this.release(sandboxId);
    return expired.length;
  }

  async release(sandboxId: string): Promise<void> {
    const sandbox = this.sandboxes.get(sandboxId);
    this.sandboxes.delete(sandboxId);
    await sandbox?.client.$disconnect();
    await this.exclusive(() => this.admin.dropDatabase(sandboxDatabase(sandboxId)));
    await rm(join(this.config.get("UPLOAD_DIR"), sandboxId), { recursive: true, force: true });
  }

  // The registry lives in memory, so sandboxes left by a previous process can never be reached.
  async dropOrphans(): Promise<void> {
    const databases = await this.admin.listDatabases(SANDBOX_DATABASE_PREFIX);
    for (const database of databases) {
      await this.exclusive(() => this.admin.dropDatabase(database));
    }
    const uploadDir = this.config.get("UPLOAD_DIR");
    const entries = await readdir(uploadDir).catch(() => []);
    for (const entry of entries.filter(isSandboxId)) {
      await rm(join(uploadDir, entry), { recursive: true, force: true });
    }
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([...this.sandboxes.values()].map((sandbox) => sandbox.client.$disconnect()));
  }
}
