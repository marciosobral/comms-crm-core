import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { ListCustomersQuery } from "./list-customers.query";

async function monthErrors(month: string) {
  const errors = await validate(plainToInstance(ListCustomersQuery, { month }));
  return errors.filter((error) => error.property === "month");
}

describe("ListCustomersQuery month", () => {
  it("accepts a valid month", async () => {
    expect(await monthErrors("2026-10")).toHaveLength(0);
  });

  it.each(["2026-13", "2026-00", "2026-1", "abc"])("rejects %s", async (month) => {
    expect(await monthErrors(month)).toHaveLength(1);
  });
});
