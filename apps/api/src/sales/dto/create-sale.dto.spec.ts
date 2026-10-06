import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { CreateSaleDto } from "./create-sale.dto";

function baseInput(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    customer: {
      name: "Fulano de Tal",
      cpfCnpj: "12345678909",
      birthDate: "1990-01-01",
      motherName: "Beltrana de Tal",
      email: "fulano@example.com",
      phone1: "62988887777",
      phone2: "62988886666",
      address: {
        postalCode: "60000000",
        street: "Rua A",
        number: "10",
        neighborhood: "Centro",
        city: "Fortaleza",
        state: "CE",
      },
    },
    planId: "plan-1",
    statusId: "status-1",
    paymentMethodId: "pay-1",
    amount: 100,
    dueDay: 10,
    date: "2026-01-01",
    ...overrides,
  };
}

async function validateInput(input: Record<string, unknown>) {
  return validate(plainToInstance(CreateSaleDto, input));
}

describe("CreateSaleDto", () => {
  it("passes with a complete new-customer payload", async () => {
    const errors = await validateInput(baseInput());
    expect(errors).toHaveLength(0);
  });

  it("requires the due day", async () => {
    const { dueDay, ...input } = baseInput();
    const errors = await validateInput(input);
    const dueDayError = errors.find((error) => error.property === "dueDay");
    expect(dueDayError?.constraints).toMatchObject({ isNotEmpty: "Informe o dia de vencimento" });
  });

  it("requires the new customer's personal details", async () => {
    const errors = await validateInput(
      baseInput({
        customer: {
          name: "Fulano de Tal",
          cpfCnpj: "12345678909",
          address: (baseInput().customer as Record<string, unknown>).address,
        },
      }),
    );
    const customerError = errors.find((error) => error.property === "customer");
    const childProperties = customerError?.children?.map((child) => child.property) ?? [];
    expect(childProperties).toEqual(
      expect.arrayContaining(["birthDate", "motherName", "email", "phone1", "phone2"]),
    );
  });

  it("explains an out-of-range due day", async () => {
    const errors = await validateInput(baseInput({ dueDay: 30 }));
    const dueDayError = errors.find((error) => error.property === "dueDay");
    expect(dueDayError?.constraints).toMatchObject({
      max: "O vencimento deve ser um dia entre 1 e 28",
    });
  });

  it("rejects an invalid birth date and a blank mother's name", async () => {
    const customer = {
      ...(baseInput().customer as Record<string, unknown>),
      birthDate: "abc",
      motherName: "   ",
    };
    const errors = await validateInput(baseInput({ customer }));
    const customerError = errors.find((error) => error.property === "customer");
    const childProperties = customerError?.children?.map((child) => child.property) ?? [];
    expect(childProperties).toEqual(expect.arrayContaining(["birthDate", "motherName"]));
  });

  it("does not require personal details once an existing customer id is given", async () => {
    const errors = await validateInput(
      baseInput({
        customer: { id: "cust-1", name: "Fulano de Tal", customerAddressId: "addr-1" },
      }),
    );
    expect(errors).toHaveLength(0);
  });

  it.each(["2026-10-06T10:00", "06/10/2026"])("rejects the sale date %s", async (date) => {
    const errors = await validateInput(baseInput({ date }));
    const dateError = errors.find((error) => error.property === "date");
    expect(dateError?.constraints).toMatchObject({ matches: "Data inválida" });
  });

  it.each([
    ["scheduleDate", null],
    ["scheduleDate", ""],
    ["scheduleDate", "2026-10-06"],
    ["installedAt", null],
    ["installedAt", ""],
    ["installedAt", "2026-10-06"],
  ])("accepts %s as %j", async (field, value) => {
    const errors = await validateInput(baseInput({ [field]: value }));
    expect(errors).toHaveLength(0);
  });

  it.each(["2026-02-30", "2026-13-01"])("rejects the impossible sale date %s", async (date) => {
    const errors = await validateInput(baseInput({ date }));
    expect(errors.some((error) => error.property === "date")).toBe(true);
  });

  it.each(["2026-02-30", "2026-13-01"])(
    "rejects the impossible birth date %s",
    async (birthDate) => {
      const customer = { ...(baseInput().customer as Record<string, unknown>), birthDate };
      const errors = await validateInput(baseInput({ customer }));
      const customerError = errors.find((error) => error.property === "customer");
      expect(customerError?.children?.some((child) => child.property === "birthDate")).toBe(true);
    },
  );

  it.each(["scheduleDate", "installedAt"])("rejects a %s that carries a time", async (field) => {
    const errors = await validateInput(baseInput({ [field]: "2026-10-06T22:00" }));
    const fieldError = errors.find((error) => error.property === field);
    expect(fieldError?.constraints).toMatchObject({ matches: "Data inválida" });
  });
});
