import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { currentSandboxId, runInSandbox, sandboxPath } from "./sandbox-context";

const SANDBOX = "a".repeat(32);

describe("sandbox context", () => {
  it("has no sandbox outside runInSandbox", () => {
    expect(currentSandboxId()).toBeUndefined();
  });

  it("keeps the sandbox across awaits", async () => {
    const seen = await runInSandbox(SANDBOX, async () => {
      await Promise.resolve();
      return currentSandboxId();
    });
    expect(seen).toBe(SANDBOX);
  });

  it("places files under the sandbox folder only inside a sandbox", () => {
    expect(sandboxPath("/data/uploads")).toBe("/data/uploads");
    expect(runInSandbox(SANDBOX, () => sandboxPath("/data/uploads"))).toBe(
      join("/data/uploads", SANDBOX),
    );
  });
});
