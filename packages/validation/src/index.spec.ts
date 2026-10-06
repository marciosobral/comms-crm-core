import { describe, expect, it } from "vitest";
import {
  BANKS,
  DATE_ONLY_PATTERN,
  MESSAGES,
  applyCepMask,
  applyCnpjMask,
  applyCpfCnpjMask,
  applyCpfMask,
  applyMoneyMask,
  applyPhoneMask,
  businessCalendarDate,
  businessDateKey,
  businessDayStart,
  businessHour,
  businessMonthKey,
  businessMonthRange,
  businessToday,
  csvField,
  dateOnlyKey,
  dateOnlyMonthKey,
  digitsOnly,
  findBank,
  formatCep,
  formatCnpj,
  formatCpf,
  formatCpfCnpj,
  formatDisplayCpfCnpj,
  formatPhone,
  isCep,
  isCnpj,
  isCpf,
  isCpfCnpj,
  isEmail,
  isMaskedCpfCnpj,
  isPhone,
  isUf,
  isoLocalDate,
  maskCpfCnpj,
  monthKey,
  normalizeEmail,
  normalizeUf,
  parseMoney,
  shiftDateKey,
  shiftMonthKey,
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

describe("banks", () => {
  it("finds a bank by its three-digit COMPE code", () => {
    expect(findBank("001")?.name).toBe("BCO DO BRASIL S.A.");
    expect(findBank("260")?.name).toBe("NU PAGAMENTOS - IP");
  });

  it("returns undefined for an unknown code", () => {
    expect(findBank("999999")).toBeUndefined();
  });

  it("has unique codes", () => {
    expect(new Set(BANKS.map((bank) => bank.code)).size).toBe(BANKS.length);
  });
});

describe("dates", () => {
  const date = new Date(2026, 0, 5, 15, 30);

  it("formats the month key in local time", () => {
    expect(monthKey(date)).toBe("2026-01");
  });

  it("formats the ISO date in local time", () => {
    expect(isoLocalDate(date)).toBe("2026-01-05");
  });

  it("reads date-only values in UTC", () => {
    const saleDate = new Date("2026-10-01");
    expect(dateOnlyKey(saleDate)).toBe("2026-10-01");
    expect(dateOnlyMonthKey(saleDate)).toBe("2026-10");
  });

  it("reads instants in the business timezone", () => {
    const lateNight = new Date("2026-10-07T01:30:00Z"); // 22:30 on 06/10 in São Paulo
    expect(businessDateKey(lateNight)).toBe("2026-10-06");
    expect(businessMonthKey(new Date("2026-11-01T02:00:00Z"))).toBe("2026-10");
    expect(businessHour(lateNight)).toBe(22);
    const calendar = businessCalendarDate(lateNight);
    expect([calendar.getFullYear(), calendar.getMonth(), calendar.getDate()]).toEqual([2026, 9, 6]);
    expect(calendar.getHours()).toBe(0);
  });

  it("returns today as a date-only value", () => {
    expect(dateOnlyKey(businessToday())).toBe(businessDateKey());
    expect(businessToday().getUTCHours()).toBe(0);
  });

  it("finds the instant a business day and month start", () => {
    expect(businessDayStart("2026-10-06").toISOString()).toBe("2026-10-06T03:00:00.000Z");
    const range = businessMonthRange("2026-12");
    expect(range.gte.toISOString()).toBe("2026-12-01T03:00:00.000Z");
    expect(range.lt.toISOString()).toBe("2027-01-01T03:00:00.000Z");
  });

  it("shifts month and day keys across year ends", () => {
    expect(shiftMonthKey("2026-01", -1)).toBe("2025-12");
    expect(shiftMonthKey("2026-10", -5)).toBe("2026-05");
    expect(shiftMonthKey("2026-12", 1)).toBe("2027-01");
    expect(shiftDateKey("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftDateKey("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("matches date-only strings", () => {
    expect(DATE_ONLY_PATTERN.test("2026-10-06")).toBe(true);
    expect(DATE_ONLY_PATTERN.test("2026-10-06T10:00")).toBe(false);
    expect(DATE_ONLY_PATTERN.test("06/10/2026")).toBe(false);
  });
});

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

  it("prefixes formula-injection payloads", () => {
    expect(csvField("=CMD(1)")).toBe("'=CMD(1)");
    expect(csvField("+55 62 99999-9999")).toBe("'+55 62 99999-9999");
    expect(csvField("-1+1")).toBe("'-1+1");
    expect(csvField("@SUM(1,1)")).toBe("'@SUM(1,1)");
  });
});
