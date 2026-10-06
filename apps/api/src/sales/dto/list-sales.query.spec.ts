import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { ListSalesQuery } from "./list-sales.query";

async function dateErrors(field: "from" | "to", value: string) {
  const errors = await validate(plainToInstance(ListSalesQuery, { [field]: value }));
  return errors.filter((error) => error.property === field);
}

describe("ListSalesQuery dates", () => {
  it.each(["from", "to"] as const)("accepts a valid %s", async (field) => {
    expect(await dateErrors(field, "2026-10-06")).toHaveLength(0);
  });

  it.each(["from", "to"] as const)("rejects invalid %s values", async (field) => {
    for (const value of ["abc", "2026-02-30", "2026-10-06T10:00"]) {
      expect(await dateErrors(field, value)).toHaveLength(1);
    }
  });
});

describe("ListSalesQuery dateBy", () => {
  it.each(["sale", "installation"])("accepts %s", async (value) => {
    const errors = await validate(plainToInstance(ListSalesQuery, { dateBy: value }));
    expect(errors).toHaveLength(0);
  });

  it("rejects other values", async () => {
    const errors = await validate(plainToInstance(ListSalesQuery, { dateBy: "date" }));
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints?.isIn).toBe("Contagem inválida");
  });
});
