import { describe, expect, it } from "vitest";
import { salesToCsv } from "./sale-csv";

describe("salesToCsv", () => {
  it("builds a header and one row per sale", () => {
    const csv = salesToCsv([
      {
        date: new Date(2026, 7, 25),
        amount: "109.99",
        customer: { name: "Fulana de Tal" },
        plan: { name: "Plano Net" },
        seller: { name: "Beltrana Souza" },
        status: { value: "GROSS" },
      },
    ]);
    expect(csv).toBe(
      "data;cliente;plano;vendedor;status;valor\n25/08/2026;Fulana de Tal;Plano Net;Beltrana Souza;GROSS;109,99",
    );
  });

  it("uses a dash for sales without a plan", () => {
    const csv = salesToCsv([
      {
        date: new Date(2026, 0, 1),
        amount: "50",
        customer: { name: "Fulana de Tal" },
        plan: null,
        seller: { name: "Beltrana Souza" },
        status: { value: "GROSS" },
      },
    ]);
    expect(csv).toContain(";'-;");
  });
});
