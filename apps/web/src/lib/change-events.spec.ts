import { describe, expect, it } from "vitest";
import { parseServerSentEvents, queryKeysForChange, toChangeEvent } from "./change-events";

describe("parseServerSentEvents", () => {
  it("accepts CRLF line endings", () => {
    const { events } = parseServerSentEvents('event: change\r\ndata: {"entity":"Plan"}\r\n\r\n');
    expect(events).toEqual([{ type: "change", data: '{"entity":"Plan"}' }]);
  });

  it("splits complete events and keeps the unfinished tail", () => {
    const { events, rest } = parseServerSentEvents(
      'event: change\ndata: {"entity":"Role","id":"r1"}\n\nevent: ping\ndata: \n\nevent: cha',
    );
    expect(events).toEqual([
      { type: "change", data: '{"entity":"Role","id":"r1"}' },
      { type: "ping", data: "" },
    ]);
    expect(rest).toBe("event: cha");
  });
});

describe("toChangeEvent", () => {
  it("reads a change and ignores pings and malformed payloads", () => {
    expect(toChangeEvent({ type: "change", data: '{"entity":"Sale"}' })).toEqual({
      entity: "Sale",
    });
    expect(toChangeEvent({ type: "ping", data: "" })).toBeNull();
    expect(toChangeEvent({ type: "change", data: "not json" })).toBeNull();
    expect(toChangeEvent({ type: "change", data: '{"entity":1}' })).toBeNull();
  });
});

describe("queryKeysForChange", () => {
  it("refreshes roles and everything that shows a role", () => {
    expect(queryKeysForChange({ entity: "Role" })).toEqual([
      ["roles"],
      ["users"],
      ["me"],
      ["assignable-people"],
    ]);
  });

  it("refreshes sale screens when a name they show changes", () => {
    for (const entity of ["User", "Plan", "DomainValue"]) {
      expect(queryKeysForChange({ entity }), entity).toContainEqual(["sales"]);
    }
  });

  it("ignores entities the web app does not cache", () => {
    expect(queryKeysForChange({ entity: "Unknown" })).toEqual([]);
  });
});
