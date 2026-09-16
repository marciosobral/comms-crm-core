import { describe, expect, it, vi } from "vitest";
import { AppException } from "../logging/app-exception";
import { ImportsService } from "./imports.service";
import { parseCsv, rowHash } from "./parser";

const ctx = { userId: "admin-1", ip: null, userAgent: null };

const HEADER =
  "PDV;LOGIN;BKO;SISTEMA;AUDITOR;ORDEM DE VENDA;STATUS;MAILING;VENDEDOR;SUPERVISOR;PLANO FIXO;PLANO INTERNET; VENCIMENTO;VALOR;QTD;UF;CIDADE;CPF/CNPJ;DATA;NOME / RAZÃO SOCIAL;OBS;CONTATO 1;CONTATO 2;E-MAIL;FORMA DE PAG;AUDITORIA;AGENDAMENTO;INSTALAÇÃO;BRScan;;;;";
const LINE_OK =
  "PDV PADRÃO;T1000001;;;;1-100;GROSS;;BELTRANA;;-;400 MB;20;109,99;1;GO;GOIÂNIA;111.111.111-11;01/jun;CLIENTE UM;;;;;BOLETO;;;;SIM;;;;";
const LINE_UNKNOWN_STATUS =
  "PDV PADRÃO;T1000001;;;;1-200;EM ROTA;;BELTRANA;;-;400 MB;20;109,99;1;GO;GOIÂNIA;222.222.222-22;01/jun;CLIENTE DOIS;;;;;BOLETO;;;;SIM;;;;";

function makeService(existingRows: Array<Record<string, unknown>> = []) {
  const prisma = {
    domainValue: {
      findMany: vi.fn().mockResolvedValue([
        { id: "st-1", type: "SALE_STATUS", value: "GROSS" },
        { id: "pay-1", type: "PAYMENT_METHOD", value: "BOLETO" },
        { id: "pdv-1", type: "PDV", value: "PDV PADRÃO" },
      ]),
    },
    user: { findMany: vi.fn().mockResolvedValue([{ id: "u-vit", name: "BELTRANA" }]) },
    plan: { findMany: vi.fn().mockResolvedValue([{ id: "plan-400", name: "400 MB" }]) },
    importMapping: { findMany: vi.fn().mockResolvedValue([]) },
    importRow: {
      findMany: vi.fn().mockResolvedValue(existingRows),
      create: vi
        .fn()
        .mockImplementation((args: { data: Record<string, unknown> }) =>
          Promise.resolve({ id: `row-${Math.random()}`, ...args.data }),
        ),
      update: vi.fn().mockResolvedValue({}),
      groupBy: vi.fn().mockResolvedValue([]),
    },
    importBatch: {
      create: vi
        .fn()
        .mockImplementation((args: { data: Record<string, unknown> }) =>
          Promise.resolve({ id: "batch-1", createdAt: new Date(), ...args.data }),
        ),
      update: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
    },
    customer: { upsert: vi.fn().mockResolvedValue({ id: "c-1" }) },
    customerAddress: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: "addr-1" }),
    },
    saleAddress: {
      upsert: vi.fn().mockResolvedValue({ id: "sa-1" }),
    },
    sale: {
      create: vi.fn().mockResolvedValue({ id: "sale-1" }),
      update: vi.fn().mockResolvedValue({ id: "sale-1" }),
    },
  };
  const audit = { record: vi.fn().mockResolvedValue(undefined) };
  const svc = new ImportsService(
    prisma as unknown as ConstructorParameters<typeof ImportsService>[0],
    audit as unknown as ConstructorParameters<typeof ImportsService>[1],
  );
  return { svc, prisma, audit };
}

function csvBuffer(...lines: string[]): Buffer {
  return Buffer.from([HEADER, ...lines].join("\n"), "utf8");
}

describe("ImportsService.runImport", () => {
  it("creates a sale for a fully resolvable line", async () => {
    const { svc, prisma } = makeService();
    const result = await svc.runImport(csvBuffer(LINE_OK), "junho.csv", 2026, ctx);
    expect(result.stats).toEqual({ total: 1, created: 1, updated: 0, skipped: 0, pending: 0 });
    expect(prisma.customer.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { cpfCnpj: "11111111111" } }),
    );
    expect(prisma.sale.create).toHaveBeenCalledTimes(1);
    expect(prisma.saleAddress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ city: "GOIÂNIA", state: "GO", saleId: "sale-1" }),
      }),
    );
    const saleData = prisma.sale.create.mock.calls[0][0].data;
    expect(saleData.statusId).toBe("st-1");
    expect(saleData.sellerId).toBe("u-vit");
    expect(saleData.amount).toBe(109.99);
  });

  it("marks unknown status as pending with the pt-BR message", async () => {
    const { svc, prisma } = makeService();
    const result = await svc.runImport(csvBuffer(LINE_UNKNOWN_STATUS), "junho.csv", 2026, ctx);
    expect(result.stats.pending).toBe(1);
    const rowData = prisma.importRow.create.mock.calls[0][0].data;
    expect(rowData.status).toBe("PENDING");
    expect(rowData.message).toContain("Status desconhecido: EM ROTA");
    expect(prisma.sale.create).not.toHaveBeenCalled();
  });

  it("skips a line whose hash was already imported", async () => {
    const { svc, prisma } = makeService([
      { id: "old", rowHash: "seen", status: "CREATED", dedupeKey: "x", saleId: "sale-9" },
    ]);
    const realHash = rowHash(parseCsv(LINE_OK)[0]);
    // primeira chamada de findMany é a de hashes; devolvemos o hash real da linha
    prisma.importRow.findMany = vi
      .fn()
      .mockResolvedValueOnce([{ rowHash: realHash }])
      .mockResolvedValue([]);
    const result = await svc.runImport(csvBuffer(LINE_OK), "junho.csv", 2026, ctx);
    expect(result.stats).toEqual({ total: 1, created: 0, updated: 0, skipped: 1, pending: 0 });
    const rowData = prisma.importRow.create.mock.calls[0][0].data;
    expect(rowData.status).toBe("SKIPPED");
    expect(rowData.message).toBe("Linha idêntica já importada");
    expect(prisma.sale.create).not.toHaveBeenCalled();
  });

  it("updates the same sale when the dedupe key matches a previous row", async () => {
    const { svc, prisma } = makeService();
    prisma.importRow.findMany = vi
      .fn()
      // hashes já vistos: nenhum
      .mockResolvedValueOnce([])
      // linhas anteriores por dedupeKey
      .mockResolvedValueOnce([
        { dedupeKey: "1-100|111.111.111-11|2026-06-01", saleId: "sale-9", status: "CREATED" },
      ]);
    const result = await svc.runImport(csvBuffer(LINE_OK), "junho.csv", 2026, ctx);
    expect(result.stats.updated).toBe(1);
    expect(prisma.sale.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "sale-9" } }),
    );
    expect(prisma.sale.create).not.toHaveBeenCalled();
  });

  it("audits the batch and the created sale", async () => {
    const { svc, audit } = makeService();
    await svc.runImport(csvBuffer(LINE_OK), "junho.csv", 2026, ctx);
    const entities = audit.record.mock.calls.map((call) => call[0].entity);
    expect(entities).toContain("ImportBatch");
    expect(entities).toContain("Sale");
  });
});

describe("ImportsService.reprocess", () => {
  it("updates the pre-existing keyed sale instead of creating a new one", async () => {
    const { svc, prisma } = makeService();
    const rawRow = parseCsv(LINE_OK)[0];
    prisma.importBatch.findUnique = vi.fn().mockResolvedValue({
      id: "batch-1",
      createdAt: new Date(),
      stats: { year: 2026 },
      rows: [{ id: "row-1", raw: rawRow, status: "PENDING" }],
    });
    prisma.importRow.findMany = vi
      .fn()
      .mockResolvedValue([{ dedupeKey: "1-100|111.111.111-11|2026-06-01", saleId: "sale-9" }]);
    prisma.importRow.groupBy = vi
      .fn()
      .mockResolvedValue([{ status: "UPDATED", _count: { _all: 1 } }]);

    const result = await svc.reprocess("batch-1", ctx);

    expect(prisma.sale.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "sale-9" } }),
    );
    expect(prisma.sale.create).not.toHaveBeenCalled();
    expect(prisma.importRow.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "row-1" },
        data: expect.objectContaining({ status: "UPDATED", saleId: "sale-9" }),
      }),
    );
    expect(result.resolved).toBe(1);
  });
});

describe("ImportsService import lock", () => {
  it("rejects a concurrent reprocess while a runImport is still in progress", async () => {
    const { svc, prisma } = makeService();
    let releaseBatchCreate: (value: { id: string; createdAt: Date }) => void = () => {};
    const pendingBatchCreate = new Promise<{ id: string; createdAt: Date }>((resolve) => {
      releaseBatchCreate = resolve;
    });
    prisma.importBatch.create = vi.fn().mockReturnValue(pendingBatchCreate);

    const runImportPromise = svc.runImport(csvBuffer(LINE_OK), "junho.csv", 2026, ctx);

    await expect(svc.reprocess("batch-1", ctx)).rejects.toBeInstanceOf(AppException);

    releaseBatchCreate({ id: "batch-1", createdAt: new Date() });
    const result = await runImportPromise;
    expect(result.id).toBe("batch-1");

    prisma.importBatch.findUnique = vi.fn().mockResolvedValue({
      id: "batch-1",
      createdAt: new Date(),
      stats: { year: 2026 },
      rows: [],
    });
    prisma.importRow.groupBy = vi.fn().mockResolvedValue([]);
    const reprocessResult = await svc.reprocess("batch-1", ctx);
    expect(reprocessResult.id).toBe("batch-1");
  });
});
