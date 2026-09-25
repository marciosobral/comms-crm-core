import { afterEach, describe, expect, it, vi } from "vitest";
import { ChangeEventsController } from "./change-events.controller";
import { ChangeEventsService } from "./change-events.service";

function requestWithTokenFor(ms: number) {
  return { user: { id: "u1", tokenExpiresAt: Date.now() + ms } } as unknown as Parameters<
    ChangeEventsController["stream"]
  >[0];
}

afterEach(() => {
  vi.useRealTimers();
});

describe("ChangeEventsController.stream", () => {
  it("forwards published changes and sends a heartbeat", () => {
    vi.useFakeTimers();
    const changeEvents = new ChangeEventsService();
    const received: unknown[] = [];
    const subscription = new ChangeEventsController(changeEvents)
      .stream(requestWithTokenFor(15 * 60_000))
      .subscribe((event) => received.push(event));

    changeEvents.publish({ entity: "Sale" });
    vi.advanceTimersByTime(25_000);
    subscription.unsubscribe();

    expect(received).toEqual([
      { type: "change", data: { entity: "Sale" } },
      { type: "ping", data: "" },
    ]);
  });

  it("ends when the access token expires, telling the client to reconnect", () => {
    vi.useFakeTimers();
    const received: unknown[] = [];
    let isComplete = false;
    new ChangeEventsController(new ChangeEventsService())
      .stream(requestWithTokenFor(60_000))
      .subscribe({
        next: (event) => received.push(event),
        complete: () => {
          isComplete = true;
        },
      });

    vi.advanceTimersByTime(59_000);
    expect(isComplete).toBe(false);
    vi.advanceTimersByTime(1_000);

    expect(isComplete).toBe(true);
    expect(received.at(-1)).toEqual({ type: "expire", data: "" });
  });
});
