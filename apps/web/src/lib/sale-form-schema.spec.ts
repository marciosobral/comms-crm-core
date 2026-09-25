import type { SaleDetail } from "@/lib/types";
import { MESSAGES } from "@comms-crm-core/validation";
import { describe, expect, it } from "vitest";
import {
  type SaleFormValues,
  buildSaleFormDefaultValues,
  firstSaleFormBlockingMessage,
  isBankDataComplete,
  isDirectDebitPayment,
  saleFormSchema,
  toSalePayload,
} from "./sale-form-schema";

function baseSale(overrides: Partial<SaleDetail> = {}): SaleDetail {
  const status = { id: "status-1", value: "GROSS" };
  const seller = { id: "seller-1", name: "Fulano de Tal" };
  return {
    id: "sale-1",
    orderNumber: null,
    login: null,
    qty: 1,
    amount: "100",
    dueDay: null,
    date: "2024-01-01T00:00:00.000Z",
    notes: null,
    auditNote: null,
    scheduleDate: null,
    installedAt: null,
    brscan: null,
    bankCode: null,
    bankName: null,
    bankAgency: null,
    bankAgencyDigit: null,
    bankAccount: null,
    bankAccountDigit: null,
    bankAccountType: null,
    accountHolderIsCustomer: null,
    accountHolderName: null,
    accountHolderCpf: null,
    cancelReason: null,
    canceledAt: null,
    customer: {
      id: "cust-1",
      name: "Fulano de Tal",
      cpfCnpj: "12345678909",
      birthDate: null,
      motherName: null,
      email: null,
      phone1: null,
      phone2: null,
    },
    address: null,
    status,
    paymentMethod: null,
    system: null,
    mailing: null,
    pdv: null,
    schedulePeriod: null,
    seller,
    supervisor: null,
    bko: null,
    auditor: null,
    canceledBy: null,
    plan: null,
    _count: { attachments: 0 },
    attachments: [],
    ...overrides,
  };
}

function baseValues(overrides: Partial<SaleFormValues> = {}): SaleFormValues {
  return {
    customerName: "",
    customerCpfCnpj: "",
    customerBirthDate: "",
    customerMotherName: "",
    customerEmail: "",
    customerPhone1: "",
    customerPhone2: "",
    address: {
      postalCode: "",
      street: "",
      number: "",
      noNumber: false,
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      isDefault: false,
    },
    planTypeId: "",
    planId: "",
    statusId: "",
    paymentMethodId: "",
    mailingId: "",
    amount: 0,
    dueDay: "",
    date: "",
    orderNumber: "",
    login: "",
    notes: "",
    scheduleDate: "",
    schedulePeriodId: "",
    installedAt: "",
    brscan: false,
    bankCode: "",
    bankAgency: "",
    bankAgencyDigit: "",
    bankAccount: "",
    bankAccountDigit: "",
    bankAccountType: "",
    accountHolder: "",
    accountHolderName: "",
    accountHolderCpf: "",
    sellerId: "",
    supervisorId: "",
    bkoId: "",
    auditorId: "",
    ...overrides,
  };
}

describe("buildSaleFormDefaultValues", () => {
  it("defaults brscan to false for a new sale", () => {
    expect(buildSaleFormDefaultValues().brscan).toBe(false);
  });

  it("reflects an approved BRScan check when editing a sale", () => {
    expect(buildSaleFormDefaultValues(baseSale({ brscan: true })).brscan).toBe(true);
  });

  it("defaults brscan to false when the sale has not been checked", () => {
    expect(buildSaleFormDefaultValues(baseSale({ brscan: null })).brscan).toBe(false);
  });
});

describe("toSalePayload", () => {
  it("builds the create payload for a new customer paying by boleto", () => {
    const values = baseValues({
      customerName: "Fulano de Tal",
      customerCpfCnpj: "123.456.789-09",
      planId: "plan-1",
      statusId: "status-1",
      paymentMethodId: "pay-boleto",
      amount: 100,
      date: "2024-01-01",
      sellerId: "seller-1",
    });

    const payload = toSalePayload(values, {
      mode: "create",
      isDirectDebit: false,
      canChangeSeller: true,
      customerSource: "new",
      selectedCustomerId: undefined,
      customerAddressId: "new",
    });

    expect(payload).toEqual({
      planId: "plan-1",
      paymentMethodId: "pay-boleto",
      mailingId: undefined,
      amount: 100,
      dueDay: undefined,
      date: "2024-01-01",
      orderNumber: undefined,
      login: undefined,
      notes: undefined,
      scheduleDate: undefined,
      schedulePeriodId: undefined,
      installedAt: undefined,
      supervisorId: undefined,
      bkoId: undefined,
      auditorId: undefined,
      statusId: "status-1",
      sellerId: "seller-1",
      brscan: undefined,
      customer: {
        id: undefined,
        name: "Fulano de Tal",
        cpfCnpj: "12345678909",
        birthDate: undefined,
        motherName: undefined,
        email: undefined,
        phone1: undefined,
        phone2: undefined,
      },
    });
  });

  it("builds the create payload for an existing customer paying by direct debit", () => {
    const values = baseValues({
      customerName: "Fulano de Tal",
      customerCpfCnpj: "123.xxx.x89-09",
      customerBirthDate: "1990-02-13",
      customerMotherName: "Beltrana",
      customerEmail: "Fulano@Example.com",
      customerPhone1: "(62) 98888-1234",
      planId: "plan-2",
      statusId: "status-2",
      paymentMethodId: "pay-debit",
      mailingId: "mailing-1",
      amount: 150.5,
      dueDay: "10",
      date: "2024-03-05",
      orderNumber: "ORD1",
      login: "user.login",
      notes: "obs",
      scheduleDate: "2024-03-10",
      schedulePeriodId: "period-1",
      installedAt: "2024-03-15",
      brscan: true,
      bankCode: "001",
      bankAgency: "1234",
      bankAgencyDigit: "5",
      bankAccount: "98765",
      bankAccountDigit: "x",
      bankAccountType: "CHECKING",
      accountHolder: "customer",
      sellerId: "seller-2",
      supervisorId: "sup-1",
      bkoId: "bko-1",
      auditorId: "aud-1",
    });

    const payload = toSalePayload(values, {
      mode: "create",
      isDirectDebit: true,
      canChangeSeller: true,
      customerSource: "existing",
      selectedCustomerId: "cust-1",
      customerAddressId: "addr-9",
    });

    expect(payload).toEqual({
      planId: "plan-2",
      paymentMethodId: "pay-debit",
      mailingId: "mailing-1",
      amount: 150.5,
      dueDay: 10,
      date: "2024-03-05",
      orderNumber: "ORD1",
      login: "user.login",
      notes: "obs",
      scheduleDate: "2024-03-10",
      schedulePeriodId: "period-1",
      installedAt: "2024-03-15",
      bankCode: "001",
      bankAgency: "1234",
      bankAgencyDigit: "5",
      bankAccount: "98765",
      bankAccountDigit: "X",
      bankAccountType: "CHECKING",
      accountHolderIsCustomer: true,
      accountHolderName: undefined,
      accountHolderCpf: undefined,
      supervisorId: "sup-1",
      bkoId: "bko-1",
      auditorId: "aud-1",
      statusId: "status-2",
      sellerId: "seller-2",
      brscan: true,
      customer: {
        id: "cust-1",
        name: "Fulano de Tal",
        cpfCnpj: undefined,
        birthDate: "1990-02-13",
        motherName: "Beltrana",
        email: "fulano@example.com",
        phone1: "62988881234",
        phone2: undefined,
        customerAddressId: "addr-9",
      },
    });
  });

  it("includes the account holder's own data when they are not the customer", () => {
    const values = baseValues({
      customerName: "Fulano de Tal",
      customerCpfCnpj: "123.456.789-09",
      planId: "plan-1",
      statusId: "status-1",
      paymentMethodId: "pay-debit",
      date: "2024-01-01",
      bankCode: "001",
      bankAgency: "1",
      bankAccount: "2",
      bankAccountDigit: "3",
      bankAccountType: "SAVINGS",
      accountHolder: "other",
      accountHolderName: "  Ciclano da Silva  ",
      accountHolderCpf: "123.456.789-09",
      sellerId: "seller-1",
    });

    const payload = toSalePayload(values, {
      mode: "create",
      isDirectDebit: true,
      canChangeSeller: true,
      customerSource: "new",
      selectedCustomerId: undefined,
      customerAddressId: "new",
    });

    expect(payload.accountHolderIsCustomer).toBe(false);
    expect(payload.accountHolderName).toBe("Ciclano da Silva");
    expect(payload.accountHolderCpf).toBe("12345678909");
  });

  it("omits the holder CPF when it is still the masked value returned by the API", () => {
    const values = baseValues({
      customerName: "Fulano de Tal",
      customerCpfCnpj: "123.456.789-09",
      planId: "plan-1",
      statusId: "status-1",
      paymentMethodId: "pay-debit",
      date: "2024-01-01",
      bankCode: "001",
      bankAgency: "1",
      bankAccount: "2",
      bankAccountDigit: "3",
      bankAccountType: "SAVINGS",
      accountHolder: "other",
      accountHolderName: "Ciclano",
      accountHolderCpf: "123.xxx.x89-09",
      sellerId: "seller-1",
    });

    const payload = toSalePayload(values, {
      mode: "create",
      isDirectDebit: true,
      canChangeSeller: true,
      customerSource: "new",
      selectedCustomerId: undefined,
      customerAddressId: "new",
    });

    expect(payload.accountHolderCpf).toBeUndefined();
  });

  it("sends a freshly typed address when there is no catalog address to reuse", () => {
    const values = baseValues({
      customerName: "Fulano de Tal",
      customerCpfCnpj: "123.456.789-09",
      planId: "plan-1",
      statusId: "status-1",
      paymentMethodId: "pay-boleto",
      date: "2024-01-01",
      sellerId: "seller-1",
      address: {
        postalCode: "60000-000",
        street: "Rua A",
        number: "10",
        noNumber: false,
        complement: "",
        neighborhood: "Centro",
        city: "Fortaleza",
        state: "ce",
        isDefault: false,
      },
    });

    const payload = toSalePayload(values, {
      mode: "create",
      isDirectDebit: false,
      canChangeSeller: true,
      customerSource: "new",
      selectedCustomerId: undefined,
      customerAddressId: "new",
    });

    expect(payload.customer.customerAddressId).toBeUndefined();
    expect(payload.customer.address).toEqual({
      postalCode: "60000000",
      street: "Rua A",
      number: "10",
      noNumber: false,
      complement: undefined,
      neighborhood: "Centro",
      city: "Fortaleza",
      state: "CE",
      isDefault: false,
    });
  });

  it("omits the seller when the user cannot change it", () => {
    const values = baseValues({
      customerName: "Fulano de Tal",
      customerCpfCnpj: "123.456.789-09",
      planId: "plan-1",
      statusId: "status-1",
      paymentMethodId: "pay-boleto",
      date: "2024-01-01",
      sellerId: "seller-1",
    });

    const payload = toSalePayload(values, {
      mode: "create",
      isDirectDebit: false,
      canChangeSeller: false,
      customerSource: "new",
      selectedCustomerId: undefined,
      customerAddressId: "new",
    });

    expect(payload.sellerId).toBeUndefined();
  });

  it("clears plan/schedule fields with null in edit mode but omits other blanks, and drops create-only fields", () => {
    const values = baseValues({
      planId: "",
      paymentMethodId: "pay-boleto",
      mailingId: "",
      amount: 200,
      date: "2024-05-01",
      orderNumber: "",
      scheduleDate: "",
      schedulePeriodId: "",
      installedAt: "",
    });

    const payload = toSalePayload(values, {
      mode: "edit",
      isDirectDebit: false,
      canChangeSeller: true,
      customerSource: "new",
      selectedCustomerId: undefined,
      customerAddressId: "new",
    });

    expect(payload).toEqual({
      planId: null,
      paymentMethodId: "pay-boleto",
      mailingId: undefined,
      amount: 200,
      dueDay: undefined,
      date: "2024-05-01",
      orderNumber: undefined,
      login: undefined,
      notes: undefined,
      scheduleDate: null,
      schedulePeriodId: null,
      installedAt: null,
      supervisorId: undefined,
      bkoId: undefined,
      auditorId: undefined,
      brscan: false,
    });
    expect(payload).not.toHaveProperty("customer");
    expect(payload).not.toHaveProperty("statusId");
    expect(payload).not.toHaveProperty("sellerId");
  });

  it("carries the BRScan flag through in edit mode", () => {
    const values = baseValues({ paymentMethodId: "pay-boleto", date: "2024-05-01", brscan: true });

    const payload = toSalePayload(values, {
      mode: "edit",
      isDirectDebit: false,
      canChangeSeller: true,
      customerSource: "new",
      selectedCustomerId: undefined,
      customerAddressId: "new",
    });

    expect(payload.brscan).toBe(true);
  });

  it("sends an unticked BRScan in edit mode so it can be cleared", () => {
    const values = baseValues({ paymentMethodId: "pay-boleto", date: "2024-05-01", brscan: false });

    const payload = toSalePayload(values, {
      mode: "edit",
      isDirectDebit: false,
      canChangeSeller: true,
      customerSource: "new",
      selectedCustomerId: undefined,
      customerAddressId: "new",
    });

    expect(payload.brscan).toBe(false);
  });

  it("includes bank fields in edit mode when the payment is direct debit", () => {
    const values = baseValues({
      paymentMethodId: "pay-debit",
      date: "2024-05-01",
      bankCode: "001",
      bankAgency: "1",
      bankAccount: "2",
      bankAccountDigit: "3",
      bankAccountType: "CHECKING",
      accountHolder: "customer",
    });

    const payload = toSalePayload(values, {
      mode: "edit",
      isDirectDebit: true,
      canChangeSeller: true,
      customerSource: "new",
      selectedCustomerId: undefined,
      customerAddressId: "new",
    });

    expect(payload.bankCode).toBe("001");
    expect(payload.accountHolderIsCustomer).toBe(true);
  });
});

describe("saleFormSchema", () => {
  it("requires a valid CPF/CNPJ for a brand-new customer", () => {
    const schema = saleFormSchema({
      mode: "create",
      hasSelectedCustomer: false,
      editingNewAddress: false,
    });
    const result = schema.safeParse(baseValues({ customerCpfCnpj: "111.111.111-11" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.join(".") === "customerCpfCnpj");
      expect(issue?.message).toBe(MESSAGES.cpfCnpj);
    }
  });

  it("skips the CPF/CNPJ check once an existing customer is selected", () => {
    const schema = saleFormSchema({
      mode: "create",
      hasSelectedCustomer: true,
      editingNewAddress: false,
    });
    const values = baseValues({ customerCpfCnpj: "123.xxx.x89-09", dueDay: "10" });
    expect(schema.safeParse(values).success).toBe(true);
  });

  it("validates optional customer email and phone", () => {
    const schema = saleFormSchema({
      mode: "create",
      hasSelectedCustomer: true,
      editingNewAddress: false,
    });
    expect(schema.safeParse(baseValues({ customerEmail: "not-an-email" })).success).toBe(false);
    expect(schema.safeParse(baseValues({ customerEmail: "", dueDay: "10" })).success).toBe(true);
    expect(schema.safeParse(baseValues({ customerPhone1: "123" })).success).toBe(false);
  });

  it("requires the new customer's personal details when there is no selected customer", () => {
    const schema = saleFormSchema({
      mode: "create",
      hasSelectedCustomer: false,
      editingNewAddress: false,
    });
    const result = schema.safeParse(
      baseValues({ customerCpfCnpj: "123.456.789-09", dueDay: "10" }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path.join("."));
      expect(paths).toEqual(
        expect.arrayContaining([
          "customerBirthDate",
          "customerMotherName",
          "customerEmail",
          "customerPhone1",
          "customerPhone2",
        ]),
      );
    }
  });

  it("does not require the new customer's personal details once an existing customer is selected", () => {
    const schema = saleFormSchema({
      mode: "create",
      hasSelectedCustomer: true,
      editingNewAddress: false,
    });
    expect(schema.safeParse(baseValues({ dueDay: "10" })).success).toBe(true);
  });

  it("validates the new address only when the user is filling one in", () => {
    const values = baseValues({
      dueDay: "10",
      address: {
        postalCode: "123",
        street: "",
        number: "",
        noNumber: false,
        complement: "",
        neighborhood: "",
        city: "",
        state: "XX",
        isDefault: false,
      },
    });

    const editingNew = saleFormSchema({
      mode: "create",
      hasSelectedCustomer: true,
      editingNewAddress: true,
    });
    expect(editingNew.safeParse(values).success).toBe(false);

    const reusingCatalog = saleFormSchema({
      mode: "create",
      hasSelectedCustomer: true,
      editingNewAddress: false,
    });
    expect(reusingCatalog.safeParse(values).success).toBe(true);
  });

  it("requires every new address field except complement", () => {
    const schema = saleFormSchema({
      mode: "create",
      hasSelectedCustomer: true,
      editingNewAddress: true,
    });
    const result = schema.safeParse(baseValues({ dueDay: "10" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path.join("."));
      expect(paths).toEqual(
        expect.arrayContaining([
          "address.postalCode",
          "address.street",
          "address.number",
          "address.neighborhood",
          "address.city",
          "address.state",
        ]),
      );
      expect(paths).not.toContain("address.complement");
    }
  });

  it("accepts a new address marked S/N without a street number", () => {
    const schema = saleFormSchema({
      mode: "create",
      hasSelectedCustomer: true,
      editingNewAddress: true,
    });
    const values = baseValues({
      dueDay: "10",
      address: {
        postalCode: "60000-000",
        street: "Rua A",
        number: "",
        noNumber: true,
        complement: "",
        neighborhood: "Centro",
        city: "Fortaleza",
        state: "CE",
        isDefault: false,
      },
    });
    expect(schema.safeParse(values).success).toBe(true);
  });

  it("requires the due day on every new sale", () => {
    const schema = saleFormSchema({
      mode: "create",
      hasSelectedCustomer: true,
      editingNewAddress: false,
    });
    const result = schema.safeParse(baseValues());
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.join(".") === "dueDay");
      expect(issue?.message).toBe("Informe o dia de vencimento");
    }
  });

  it("skips all create-only checks in edit mode", () => {
    const schema = saleFormSchema({
      mode: "edit",
      hasSelectedCustomer: false,
      editingNewAddress: false,
    });
    const values = baseValues({ customerCpfCnpj: "not-a-document", customerEmail: "bad" });
    expect(schema.safeParse(values).success).toBe(true);
  });
});

describe("isBankDataComplete", () => {
  it("is false until every required bank field is filled", () => {
    expect(isBankDataComplete(baseValues())).toBe(false);
  });

  it("is true once the customer is the account holder and bank data is filled", () => {
    const values = baseValues({
      bankCode: "001",
      bankAgency: "1",
      bankAccount: "2",
      bankAccountDigit: "3",
      bankAccountType: "CHECKING",
      accountHolder: "customer",
    });
    expect(isBankDataComplete(values)).toBe(true);
  });

  it("requires the holder's name and a valid CPF when it is not the customer", () => {
    const values = baseValues({
      bankCode: "001",
      bankAgency: "1",
      bankAccount: "2",
      bankAccountDigit: "3",
      bankAccountType: "CHECKING",
      accountHolder: "other",
      accountHolderName: "Ciclano",
      accountHolderCpf: "111.111.111-11",
    });
    expect(isBankDataComplete(values)).toBe(false);
    expect(isBankDataComplete({ ...values, accountHolderCpf: "123.456.789-09" })).toBe(true);
  });
});

describe("isDirectDebitPayment", () => {
  it("matches labels containing DÉBITO regardless of case", () => {
    expect(isDirectDebitPayment("Débito em conta")).toBe(true);
    expect(isDirectDebitPayment("Boleto")).toBe(false);
    expect(isDirectDebitPayment(undefined)).toBe(false);
  });
});

describe("firstSaleFormBlockingMessage", () => {
  it("checks plan/status/date, then payment method, then bank data, then customer selection", () => {
    const values = baseValues();

    expect(
      firstSaleFormBlockingMessage(values, {
        mode: "create",
        hasValidPlan: false,
        isDirectDebit: false,
        isBankDataComplete: false,
        requireExistingCustomerSelection: true,
      }),
    ).toBe("Preencha plano, status e data");

    expect(
      firstSaleFormBlockingMessage(
        { ...values, statusId: "s", date: "2024-01-01" },
        {
          mode: "create",
          hasValidPlan: true,
          isDirectDebit: false,
          isBankDataComplete: false,
          requireExistingCustomerSelection: true,
        },
      ),
    ).toBe("Selecione a forma de pagamento");

    expect(
      firstSaleFormBlockingMessage(
        { ...values, statusId: "s", date: "2024-01-01", paymentMethodId: "p" },
        {
          mode: "create",
          hasValidPlan: true,
          isDirectDebit: true,
          isBankDataComplete: false,
          requireExistingCustomerSelection: true,
        },
      ),
    ).toBe("Preencha todos os dados bancários para débito automático");

    expect(
      firstSaleFormBlockingMessage(
        { ...values, statusId: "s", date: "2024-01-01", paymentMethodId: "p" },
        {
          mode: "create",
          hasValidPlan: true,
          isDirectDebit: false,
          isBankDataComplete: true,
          requireExistingCustomerSelection: true,
        },
      ),
    ).toBe("Selecione um cliente");

    expect(
      firstSaleFormBlockingMessage(
        { ...values, statusId: "s", date: "2024-01-01", paymentMethodId: "p" },
        {
          mode: "create",
          hasValidPlan: true,
          isDirectDebit: false,
          isBankDataComplete: true,
          requireExistingCustomerSelection: false,
        },
      ),
    ).toBeNull();
  });
});
