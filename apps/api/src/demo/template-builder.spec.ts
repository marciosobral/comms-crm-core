import { describe, expect, it, vi } from "vitest";
import { TemplateBuilder } from "./template-builder";

vi.mock("./fake-data/write-dataset", () => ({
  clearTables: vi.fn().mockResolvedValue(undefined),
  writeDemoDataset: vi.fn().mockResolvedValue(undefined),
}));

describe("TemplateBuilder.rebuild", () => {
  it("fills a fresh copy of the base database and swaps it in, inside the DDL queue", async () => {
    const calls: string[] = [];
    const admin = {
      baseDatabase: () => "crm",
      urlFor: (database: string) => `postgresql://db/${database}`,
      dropDatabase: vi.fn(async (name: string) => calls.push(`drop ${name}`)),
      cloneDatabase: vi.fn(async (name: string, from: string) =>
        calls.push(`clone ${from}->${name}`),
      ),
      renameDatabase: vi.fn(async (from: string, to: string) =>
        calls.push(`rename ${from}->${to}`),
      ),
    };
    const client = { $disconnect: vi.fn(async () => calls.push("disconnect")) };
    const clients = { create: vi.fn(() => client) };
    const sandboxes = { exclusive: vi.fn((task: () => Promise<unknown>) => task()) };
    const config = {
      get: vi.fn((key: string) => (key === "SALE_DEFAULT_PDV" ? "PDV PADRÃO" : "SISTEMA PADRÃO")),
    };
    const builder = new TemplateBuilder(
      ...([admin, sandboxes, clients, config] as unknown as ConstructorParameters<
        typeof TemplateBuilder
      >),
    );

    await builder.rebuild(new Date("2026-10-19T15:00:00Z"));

    expect(sandboxes.exclusive).toHaveBeenCalledTimes(1);
    expect(clients.create).toHaveBeenCalledWith("postgresql://db/demo_template_next");
    expect(calls).toEqual([
      "drop demo_template_next",
      "clone crm->demo_template_next",
      "disconnect",
      "drop demo_template",
      "rename demo_template_next->demo_template",
    ]);
  });
});
