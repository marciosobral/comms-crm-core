import { describe, expect, it } from "vitest";
import {
  MESSAGES,
  applyCnpjMask,
  applyCpfCnpjMask,
  applyCpfMask,
  applyMoneyMask,
  applyPhoneMask,
  applyCepMask,
  digitsOnly,
  formatCnpj,
  formatCpf,
  formatCpfCnpj,
  formatDisplayCpfCnpj,
  formatPhone,
  formatCep,
  isCnpj,
  isCpf,
  isCpfCnpj,
  isEmail,
  isMaskedCpfCnpj,
  isPhone,
  isCep,
  isUf,
  maskCpfCnpj,
  normalizeEmail,
  normalizeUf,
  parseMoney,
} from "./index.js";

describe("digitsOnly", () => {
  it("strips punctuation", () => {
    expect(digitsOnly("123.456.789-09")).toBe("12345678909");
    expect(digitsOnly("(62) 98888-1234")).toBe("62988881234");
  });
});

describe("isCpf", () => {
  it("accepts a valid CPF", () => {
    expect(isCpf("12345678909")).toBe(true);
  });

  it("rejects repeated digits and bad check digits", () => {
    expect(isCpf("11111111111")).toBe(false);
    expect(isCpf("12345678908")).toBe(false);
    expect(isCpf("1234567890")).toBe(false);
  });
});

describe("isCnpj", () => {
  it("accepts a valid CNPJ", () => {
    expect(isCnpj("11222333000181")).toBe(true);
  });

  it("rejects repeated digits", () => {
    expect(isCnpj("00000000000000")).toBe(false);
  });
});

describe("isCpfCnpj", () => {
  it("accepts either length", () => {
    expect(isCpfCnpj("12345678909")).toBe(true);
    expect(isCpfCnpj("11222333000181")).toBe(true);
    expect(isCpfCnpj("123")).toBe(false);
  });
});

describe("isPhone", () => {
  it("accepts 10 or 11 digits only", () => {
    expect(isPhone("6233334444")).toBe(true);
    expect(isPhone("62988881234")).toBe(true);
    expect(isPhone("988881234")).toBe(false);
  });
});

describe("cep", () => {
  it("accepts 8 digits and rejects other lengths", () => {
    expect(isCep("74015010")).toBe(true);
    expect(isCep("74015-010")).toBe(true);
    expect(isCep("74015")).toBe(false);
  });

  it("masks as 00000-000", () => {
    expect(applyCepMask("74015010")).toBe("74015-010");
    expect(applyCepMask("74015")).toBe("74015");
    expect(formatCep("74015010")).toBe("74015-010");
  });
});

describe("email", () => {
  it("normalizes and validates", () => {
    expect(normalizeEmail("  A@B.COM ")).toBe("a@b.com");
    expect(isEmail("a@b.com")).toBe(true);
    expect(isEmail("nope")).toBe(false);
  });
});

describe("uf", () => {
  it("accepts the 27 UFs", () => {
    expect(isUf("go")).toBe(true);
    expect(normalizeUf("go")).toBe("GO");
    expect(isUf("XX")).toBe(false);
  });
});

describe("parseMoney", () => {
  it("parses pt-BR and JSON decimals", () => {
    expect(parseMoney("1.234,56")).toBe(1234.56);
    expect(parseMoney("R$ 119,90")).toBe(119.9);
    expect(parseMoney("119.90")).toBe(119.9);
    expect(Number.isNaN(parseMoney("abc"))).toBe(true);
  });

  it("parses thousand-separated integers without a comma", () => {
    expect(parseMoney("1.234")).toBe(1234);
    expect(parseMoney("234.234.092")).toBe(234_234_092);
  });
});

describe("masks", () => {
  it("applies progressive CPF/CNPJ/phone/money masks", () => {
    expect(applyCpfMask("12345678909")).toBe("123.456.789-09");
    expect(applyCpfCnpjMask("11222333000181")).toBe("11.222.333/0001-81");
    expect(applyPhoneMask("62988881234")).toBe("(62) 98888-1234");
    expect(applyPhoneMask("6233334444")).toBe("(62) 3333-4444");
    expect(applyMoneyMask("1234,5")).toBe("1.234,5");
    expect(applyMoneyMask("119.90")).toBe("119,90");
    expect(applyMoneyMask("1.234")).toBe("1.234");
    expect(applyMoneyMask("10012313123,00")).toBe("10.012.313,00");
    expect(applyMoneyMask("234234092")).toBe("23.423.409");
    expect(formatCpf("12345678909")).toBe("123.456.789-09");
    expect(formatCnpj("11222333000181")).toBe("11.222.333/0001-81");
    expect(formatCpfCnpj("12345678909")).toBe("123.456.789-09");
    expect(formatPhone("62988881234")).toBe("(62) 98888-1234");
  });
});

describe("maskCpfCnpj", () => {
  it("keeps the first 3 and last 4 digits of a CPF", () => {
    expect(maskCpfCnpj("12345678909")).toBe("123.xxx.x89-09");
  });

  it("keeps the first 3 and last 4 digits of a CNPJ", () => {
    expect(maskCpfCnpj("11222333000181")).toBe("11.2xx.xxx/xx01-81");
  });

  it("accepts a formatted CPF", () => {
    expect(maskCpfCnpj("123.456.789-09")).toBe("123.xxx.x89-09");
  });

  it("returns empty for blank input", () => {
    expect(maskCpfCnpj("")).toBe("");
  });

  it("detects a masked value and leaves it formatted for display", () => {
    expect(isMaskedCpfCnpj("123.xxx.x89-09")).toBe(true);
    expect(isMaskedCpfCnpj("12345678909")).toBe(false);
    expect(formatDisplayCpfCnpj("123.xxx.x89-09")).toBe("123.xxx.x89-09");
    expect(formatDisplayCpfCnpj("12345678909")).toBe("123.456.789-09");
  });
});

describe("MESSAGES", () => {
  it("keeps the approved Portuguese copy", () => {
    expect(MESSAGES.cpf).toBe("CPF inválido");
    expect(MESSAGES.cnpj).toBe("CNPJ inválido");
    expect(MESSAGES.cpfCnpj).toBe("CPF ou CNPJ inválido");
    expect(MESSAGES.phone).toBe("Telefone inválido");
    expect(MESSAGES.email).toBe("E-mail inválido");
    expect(MESSAGES.uf).toBe("UF inválida");
    expect(MESSAGES.cep).toBe("CEP inválido");
    expect(MESSAGES.price).toBe("Preço inválido");
    expect(MESSAGES.priceRange).toBe("Preço mínimo não pode ser maior que o preço base");
    expect(MESSAGES.password).toBe("Senha deve ter ao menos 8 caracteres");
  });
});
