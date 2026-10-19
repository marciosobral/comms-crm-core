import { describe, expect, it } from "vitest";
import { runInSandbox } from "./sandbox-context";
import { UserThrottlerGuard } from "./user-throttler.guard";

class TrackerProbe extends UserThrottlerGuard {
  track(req: Record<string, unknown>) {
    return this.getTracker(req);
  }
}

const probe = new TrackerProbe(
  ...([{ throttlers: [] }, {}, {}] as unknown as ConstructorParameters<typeof UserThrottlerGuard>),
);

describe("UserThrottlerGuard", () => {
  it("counts requests per signed-in user, not per shared IP", async () => {
    expect(await probe.track({ user: { id: "u1" }, ip: "10.0.0.1" })).toBe("user:u1");
    expect(await probe.track({ user: { id: "u2" }, ip: "10.0.0.1" })).toBe("user:u2");
  });

  it("falls back to the IP without a user", async () => {
    expect(await probe.track({ ip: "10.0.0.1" })).toBe("10.0.0.1");
  });

  it("keeps each demo sandbox in its own bucket", async () => {
    const first = await runInSandbox("a".repeat(32), () => probe.track({ user: { id: "u1" } }));
    const second = await runInSandbox("b".repeat(32), () => probe.track({ user: { id: "u1" } }));
    expect(first).toBe(`${"a".repeat(32)}:user:u1`);
    expect(second).not.toBe(first);
    expect(await runInSandbox("a".repeat(32), () => probe.track({ ip: "10.0.0.1" }))).toBe(
      `${"a".repeat(32)}:10.0.0.1`,
    );
  });
});
