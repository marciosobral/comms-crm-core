import { describe, expect, it } from "vitest";
import { relativeNotificationTime } from "./relative-time";

// 2026-10-07T01:30Z is 22:30 on 06/10 in São Paulo.
const now = new Date("2026-10-07T01:30:00Z");

function expectBusinessZoneOutput() {
  expect(relativeNotificationTime("2026-10-07T01:10:00Z", now)).toBe("há 20 min");
  expect(relativeNotificationTime("2026-10-06T23:30:00Z", now)).toBe("há 2 h");
  expect(relativeNotificationTime("2026-10-06T02:45:00Z", now)).toBe("ontem, 23:45");
  expect(relativeNotificationTime("2026-10-04T12:00:00Z", now)).toBe("04/10, 09:00");
}

describe("relativeNotificationTime", () => {
  it("uses the business day and time", () => {
    expectBusinessZoneOutput();
  });

  it("uses the business day and time when the process runs in UTC", () => {
    const previousZone = process.env.TZ;
    process.env.TZ = "UTC";
    try {
      expectBusinessZoneOutput();
    } finally {
      if (previousZone === undefined) process.env.TZ = undefined;
      else process.env.TZ = previousZone;
    }
  });
});
