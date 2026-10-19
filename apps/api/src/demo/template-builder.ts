import type { Env } from "@/config";
import { DatabaseAdmin, SandboxClientFactory, SandboxRegistry } from "@/prisma";
import { NEXT_TEMPLATE_DATABASE, TEMPLATE_DATABASE } from "@/prisma/sandbox-names";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { buildDemoDataset } from "./fake-data/dataset";
import { clearTables, writeDemoDataset } from "./fake-data/write-dataset";

@Injectable()
export class TemplateBuilder {
  constructor(
    private readonly admin: DatabaseAdmin,
    private readonly sandboxes: SandboxRegistry,
    private readonly clients: SandboxClientFactory,
    private readonly config: ConfigService<Env, true>,
  ) {}

  rebuild(now: Date = new Date()): Promise<void> {
    return this.sandboxes.exclusive(async () => {
      await this.admin.dropDatabase(NEXT_TEMPLATE_DATABASE);
      await this.admin.cloneDatabase(NEXT_TEMPLATE_DATABASE, this.admin.baseDatabase());
      const client = this.clients.create(this.admin.urlFor(NEXT_TEMPLATE_DATABASE));
      try {
        await clearTables(client);
        await writeDemoDataset(
          client,
          buildDemoDataset({
            now,
            defaultPdv: this.config.get("SALE_DEFAULT_PDV"),
            defaultSystem: this.config.get("SALE_DEFAULT_SYSTEM"),
          }),
        );
      } finally {
        await client.$disconnect();
      }
      await this.admin.dropDatabase(TEMPLATE_DATABASE);
      await this.admin.renameDatabase(NEXT_TEMPLATE_DATABASE, TEMPLATE_DATABASE);
    });
  }
}
