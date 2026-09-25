import { describe, expect, it } from "vitest";
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
});
