import { describe, expect, it, vi } from "vitest";
import { buildDemoDataset } from "./dataset";
import { clearTables, writeDemoDataset } from "./write-dataset";

const MODELS = [
  "role",
  "user",
  "domainValue",
  "plan",
  "customer",
  "customerAddress",
  "sale",
  "saleAddress",
  "auditLog",
  "notification",
  "importBatch",
  "importRow",
  "systemSetting",
];

function fakeClient() {
  const order: string[] = [];
  const client: Record<string, unknown> = {
    $queryRaw: vi.fn().mockResolvedValue([{ tablename: "users" }, { tablename: "sales" }]),
    $executeRawUnsafe: vi.fn().mockResolvedValue(0),
  };
  for (const model of MODELS) {
    client[model] = { createMany: vi.fn(async () => order.push(model)) };
  }
  return { client, order };
}

type Client = Parameters<typeof writeDemoDataset>[0];

describe("writeDemoDataset", () => {
  it("inserts parents before children", async () => {
    const { client, order } = fakeClient();
    const data = buildDemoDataset({
      now: new Date("2026-10-19T15:00:00Z"),
      defaultPdv: "PDV PADRÃO",
      defaultSystem: "SISTEMA PADRÃO",
    });
    await writeDemoDataset(client as unknown as Client, data);
    expect(order).toEqual(MODELS);
  });
});

describe("clearTables", () => {
  it("truncates every table except the migrations log", async () => {
    const { client } = fakeClient();
    await clearTables(client as unknown as Client);
    expect(client.$executeRawUnsafe).toHaveBeenCalledWith('TRUNCATE "users", "sales" CASCADE');
  });
});
