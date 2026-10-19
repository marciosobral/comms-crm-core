import { describe, expect, it, vi } from "vitest";
import { DemoScheduler } from "./demo-scheduler";

function makeScheduler() {
  const calls: string[] = [];
  const sandboxes = {
    dropOrphans: vi.fn(async () => calls.push("dropOrphans")),
    dropExpired: vi.fn().mockResolvedValue(2),
  };
  const templates = { rebuild: vi.fn(async () => calls.push("rebuild")) };
  const logger = { log: vi.fn(), error: vi.fn() };
  const scheduler = new DemoScheduler(
    ...([sandboxes, templates, logger] as unknown as ConstructorParameters<typeof DemoScheduler>),
  );
  return { scheduler, sandboxes, templates, logger, calls };
}

describe("DemoScheduler", () => {
  it("clears leftovers before building the template on boot", async () => {
    const { scheduler, calls } = makeScheduler();
    await scheduler.onApplicationBootstrap();
    expect(calls).toEqual(["dropOrphans", "rebuild"]);
  });

  it("logs instead of throwing when the daily rebuild fails", async () => {
    const { scheduler, templates, logger } = makeScheduler();
    templates.rebuild.mockRejectedValueOnce(new Error("boom"));
    await expect(scheduler.rebuildTemplate()).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalled();
  });

  it("drops expired sandboxes", async () => {
    const { scheduler, sandboxes } = makeScheduler();
    await scheduler.dropExpiredSandboxes();
    expect(sandboxes.dropExpired).toHaveBeenCalled();
  });
});
