import { describe, expect, it } from "vitest";
import { saleStatusToBadge } from "./sale-status";

describe("saleStatusToBadge", () => {
  it("maps the four canonical statuses", () => {
    expect(saleStatusToBadge("GROSS")).toBe("gross");
    expect(saleStatusToBadge("AG. INSTALAÇÃO")).toBe("agInstalacao");
    expect(saleStatusToBadge("AG. BIOMETRIA")).toBe("agBiometria");
    expect(saleStatusToBadge("CANCELADA")).toBe("cancelada");
  });

  it("falls back to inativo for unknown values", () => {
    expect(saleStatusToBadge("EM ANÁLISE")).toBe("inativo");
  });
});
