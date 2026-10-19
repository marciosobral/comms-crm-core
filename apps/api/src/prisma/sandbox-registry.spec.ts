import { mkdir, mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AppException } from "@/logging/app-exception";
import { ErrorCode } from "@/logging/error-codes";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MAX_SANDBOXES,
  SANDBOX_IDLE_MS,
  SANDBOX_MAX_LIFETIME_MS,
  SandboxRegistry,
} from "./sandbox-registry";

async function makeRegistry() {
  const uploadDir = await mkdtemp(join(tmpdir(), "sandbox-registry-"));
  let cloning = 0;
  let maxConcurrentClones = 0;
  const admin = {
    urlFor: vi.fn((database: string) => `postgresql://crm:secret@db:5432/${database}`),
    cloneDatabase: vi.fn(async () => {
      cloning += 1;
      maxConcurrentClones = Math.max(maxConcurrentClones, cloning);
      await new Promise((resolve) => setTimeout(resolve, 1));
      cloning -= 1;
    }),
    dropDatabase: vi.fn().mockResolvedValue(undefined),
    listDatabases: vi.fn().mockResolvedValue([]),
  };
  const clients = { create: vi.fn(() => ({ $disconnect: vi.fn().mockResolvedValue(undefined) })) };
  const config = { get: vi.fn(() => uploadDir) };
  const registry = new SandboxRegistry(
    ...([admin, clients, config] as unknown as ConstructorParameters<typeof SandboxRegistry>),
  );
  return { registry, admin, clients, uploadDir, maxConcurrentClones: () => maxConcurrentClones };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("SandboxRegistry", () => {
  it("clones the template into a new sandbox database", async () => {
    const { registry, admin, clients } = await makeRegistry();
    const id = await registry.create();
    expect(id).toMatch(/^[0-9a-f]{32}$/);
    expect(admin.cloneDatabase).toHaveBeenCalledWith(`sbx_${id}`, "demo_template");
    expect(clients.create).toHaveBeenCalledWith(`postgresql://crm:secret@db:5432/sbx_${id}`);
    expect(registry.client(id)).toBeDefined();
  });

  it("clones one database at a time", async () => {
    const { registry, maxConcurrentClones } = await makeRegistry();
    await Promise.all([registry.create(), registry.create(), registry.create()]);
    expect(maxConcurrentClones()).toBe(1);
  });

  it("refuses a new sandbox when the demo is full", async () => {
    const { registry } = await makeRegistry();
    for (let i = 0; i < MAX_SANDBOXES; i++) await registry.create();
    const error = await registry.create().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(AppException);
    expect(error).toMatchObject({ code: ErrorCode.DEMO_FULL });
  });

  it("drops sandboxes idle for more than two hours, with their uploads", async () => {
    // Only Date is faked: the clone mock waits on a real timer.
    vi.useFakeTimers({ now: new Date("2026-10-19T12:00:00Z"), toFake: ["Date"] });
    const { registry, admin, uploadDir } = await makeRegistry();
    const idle = await registry.create();
    const active = await registry.create();
    await mkdir(join(uploadDir, idle));
    vi.setSystemTime(Date.now() + SANDBOX_IDLE_MS);
    registry.client(active);
    vi.setSystemTime(Date.now() + 1);

    await expect(registry.dropExpired()).resolves.toBe(1);
    expect(admin.dropDatabase).toHaveBeenCalledWith(`sbx_${idle}`);
    expect(registry.client(idle)).toBeUndefined();
    expect(registry.client(active)).toBeDefined();
    await expect(readdir(uploadDir)).resolves.toEqual([]);
  });

  it("drops sandboxes older than eight hours even when they stay active", async () => {
    vi.useFakeTimers({ now: new Date("2026-10-19T12:00:00Z"), toFake: ["Date"] });
    const { registry, admin } = await makeRegistry();
    const old = await registry.create();
    vi.setSystemTime(Date.now() + SANDBOX_MAX_LIFETIME_MS - 1);
    const fresh = await registry.create();
    registry.client(old);
    registry.client(fresh);
    await expect(registry.dropExpired()).resolves.toBe(0);

    vi.setSystemTime(Date.now() + 2);
    registry.client(old);
    registry.client(fresh);
    await expect(registry.dropExpired()).resolves.toBe(1);
    expect(admin.dropDatabase).toHaveBeenCalledWith(`sbx_${old}`);
    expect(registry.client(fresh)).toBeDefined();
  });

  it("releases one sandbox on demand", async () => {
    const { registry, admin } = await makeRegistry();
    const id = await registry.create();
    await registry.release(id);
    expect(admin.dropDatabase).toHaveBeenCalledWith(`sbx_${id}`);
    expect(registry.client(id)).toBeUndefined();
  });

  it("drops databases and upload folders left by a previous process", async () => {
    const { registry, admin, uploadDir } = await makeRegistry();
    const orphan = "b".repeat(32);
    admin.listDatabases.mockResolvedValue([`sbx_${orphan}`]);
    await mkdir(join(uploadDir, orphan));
    await mkdir(join(uploadDir, "tmp"));

    await registry.dropOrphans();

    expect(admin.listDatabases).toHaveBeenCalledWith("sbx_");
    expect(admin.dropDatabase).toHaveBeenCalledWith(`sbx_${orphan}`);
    await expect(readdir(uploadDir)).resolves.toEqual(["tmp"]);
  });
});
