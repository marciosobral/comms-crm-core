import { describe, expect, it } from "vitest";
import { shouldPlayNotificationSound } from "./notification-sound";

describe("shouldPlayNotificationSound", () => {
  it("stays silent on the first count a tab sees", () => {
    expect(shouldPlayNotificationSound(null, 1, 3)).toBe(false);
  });

  it("plays when the unread count goes up", () => {
    expect(shouldPlayNotificationSound(1, 1, 2)).toBe(true);
  });

  it("stays silent when another tab already announced this count", () => {
    expect(shouldPlayNotificationSound(1, 2, 2)).toBe(false);
  });

  it("stays silent when the count stays or goes down", () => {
    expect(shouldPlayNotificationSound(2, 2, 2)).toBe(false);
    expect(shouldPlayNotificationSound(2, 2, 0)).toBe(false);
  });

  it("falls back to the tab's own count when storage is unavailable", () => {
    expect(shouldPlayNotificationSound(1, null, 2)).toBe(true);
  });
});
