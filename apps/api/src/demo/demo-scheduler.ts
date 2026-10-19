import { WinstonLoggerService } from "@/logging/winston-logger.service";
import { SandboxRegistry } from "@/prisma";
import { BUSINESS_TIME_ZONE } from "@comms-crm-core/validation";
import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { Cron, Interval } from "@nestjs/schedule";
import { TemplateBuilder } from "./template-builder";

const EXPIRED_CLEANUP_INTERVAL_MS = 10 * 60_000;

@Injectable()
export class DemoScheduler implements OnApplicationBootstrap {
  constructor(
    private readonly sandboxes: SandboxRegistry,
    private readonly templates: TemplateBuilder,
    private readonly logger: WinstonLoggerService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.sandboxes.dropOrphans();
    await this.templates.rebuild();
    this.logger.log("demo template ready", DemoScheduler.name);
  }

  @Interval(EXPIRED_CLEANUP_INTERVAL_MS)
  async dropExpiredSandboxes(): Promise<void> {
    try {
      const dropped = await this.sandboxes.dropExpired();
      if (dropped > 0)
        this.logger.log(`dropped ${dropped} expired demo sandboxes`, DemoScheduler.name);
    } catch (error) {
      this.logger.error(
        `expired sandbox cleanup failed: ${String(error)}`,
        undefined,
        DemoScheduler.name,
      );
    }
  }

  // Demo data is dated relative to the day it was built, so the template is rebuilt daily, after the 03:00 backups.
  @Cron("30 4 * * *", { timeZone: BUSINESS_TIME_ZONE })
  async rebuildTemplate(): Promise<void> {
    try {
      await this.templates.rebuild();
      this.logger.log("demo template rebuilt", DemoScheduler.name);
    } catch (error) {
      this.logger.error(
        `demo template rebuild failed: ${String(error)}`,
        undefined,
        DemoScheduler.name,
      );
    }
  }
}
