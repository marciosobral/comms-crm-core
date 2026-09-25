import { describe, expect, it } from "vitest";
import { parseSeedFile } from "./seed-file";

const defaults = { pdv: "PDV A", system: "SIS A" };
const valid = {
  domainValues: { PDV: ["PDV A"], SYSTEM: ["SIS A"], MAILING: ["PAP", "DISPARO"] },
};

describe("parseSeedFile", () => {
  it("accepts a valid file and keeps the order", () => {
    expect(parseSeedFile(valid, defaults).domainValues.MAILING).toEqual(["PAP", "DISPARO"]);
  });

  it("rejects an unknown domain type", () => {
    const raw = { domainValues: { ...valid.domainValues, FOO: ["x"] } };
    expect(() => parseSeedFile(raw, defaults)).toThrow(/FOO/);
  });

  it("rejects empty and duplicate values", () => {
    const empty = { domainValues: { ...valid.domainValues, MAILING: [""] } };
    const duplicate = { domainValues: { ...valid.domainValues, MAILING: ["PAP", "PAP"] } };
    expect(() => parseSeedFile(empty, defaults)).toThrow();
    expect(() => parseSeedFile(duplicate, defaults)).toThrow(/PAP/);
  });

  it("requires the default PDV and system to be listed", () => {
    expect(() => parseSeedFile(valid, { pdv: "OUTRO", system: "SIS A" })).toThrow(/OUTRO/);
    expect(() => parseSeedFile(valid, { pdv: "PDV A", system: "OUTRO" })).toThrow(/OUTRO/);
  });
});
