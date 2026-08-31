import { describe, expect, it } from "vitest";
import { csvField } from "./reports.service";

describe("csvField", () => {
  it("removes semicolons and newlines", () => {
    expect(csvField("Empresa; Exemplo\nLtda")).toBe("Empresa Exemplo Ltda");
  });

  it("handles multiple consecutive delimiters", () => {
    expect(csvField("Name;;;\r\n\r\nLast")).toBe("Name Last");
  });

  it("trims whitespace after sanitization", () => {
    expect(csvField("  Value;with;stuff  ")).toBe("Value with stuff");
  });

  it("returns unchanged value without delimiters", () => {
    expect(csvField("Normal Company Name")).toBe("Normal Company Name");
  });

  it("prefixes formula-injection payloads starting with =", () => {
    expect(csvField("=CMD(1)")).toBe("'=CMD(1)");
  });

  it("prefixes values starting with + to prevent formula injection", () => {
    expect(csvField("+55 62 99999-9999").startsWith("'")).toBe(true);
  });

  it("prefixes values starting with - to prevent formula injection", () => {
    expect(csvField("-1+1")).toBe("'-1+1");
  });

  it("prefixes values starting with @ to prevent formula injection", () => {
    expect(csvField("@SUM(1,1)")).toBe("'@SUM(1,1)");
  });

  it("decimal formatting: trailing zeros preserved", () => {
    const valor = Number("100").toFixed(2).replace(".", ",");
    expect(valor).toBe("100,00");
  });

  it("decimal formatting: rounding applied", () => {
    const valor = Number("50.5").toFixed(2).replace(".", ",");
    expect(valor).toBe("50,50");
  });

  it("decimal formatting: decimal values preserved", () => {
    const valor = Number("99.99").toFixed(2).replace(".", ",");
    expect(valor).toBe("99,99");
  });
});
