import { describe, expect, it } from "vitest";
import { customerFormSchema, planFormSchema, userCreateSchema } from "./form-schemas";

describe("userCreateSchema", () => {
  it("accepts empty optional CPF and rejects an invalid one", () => {
    const base = {
      name: "Fulana",
      email: "fulana@example.com",
      cpf: "",
      phone: "",
      roleId: "",
      password: "senha123",
      confirmPassword: "senha123",
    };
    expect(userCreateSchema.safeParse(base).success).toBe(true);
    expect(userCreateSchema.safeParse({ ...base, cpf: "111.111.111-11" }).success).toBe(false);
    expect(userCreateSchema.safeParse({ ...base, cpf: "123.456.789-09" }).success).toBe(true);
  });
});

describe("customerFormSchema", () => {
  it("requires a valid CPF or CNPJ", () => {
    const base = {
      name: "Fulana",
      cpfCnpj: "123.456.789-09",
      birthDate: "",
      motherName: "",
      email: "",
      phone1: "",
      phone2: "",
      address: "",
      city: "",
      state: "go",
    };
    expect(customerFormSchema.safeParse(base).success).toBe(true);
    expect(customerFormSchema.safeParse({ ...base, cpfCnpj: "" }).success).toBe(false);
    expect(customerFormSchema.safeParse({ ...base, state: "XX" }).success).toBe(false);
  });
});

describe("planFormSchema", () => {
  it("parses money and rejects min > base", () => {
    const base = {
      name: "600 Mega",
      type: "INTERNET" as const,
      speed: "",
      featuresText: "",
      basePrice: "1.234,56",
      minPrice: "119,90",
      salesScript: "",
    };
    expect(planFormSchema.safeParse(base).success).toBe(true);
    expect(planFormSchema.safeParse({ ...base, minPrice: "2.000,00" }).success).toBe(false);
  });
});
