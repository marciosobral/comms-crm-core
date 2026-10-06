import { AppException } from "@/logging/app-exception";
import { dateOnlyKey } from "@comms-crm-core/validation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ImportsService, computeBatchStats } from "./imports.service";
import { parseCsv, rowHash } from "./parser";

const FIXED_NOW = new Date("2026-10-06T12:00:00-03:00");

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

const ctx = { userId: "admin-1", ip: null, userAgent: null };

const HEADER =
  "PDV;LOGIN;BKO;SISTEMA;AUDITOR;ORDEM DE VENDA;STATUS;MAILING;VENDEDOR;SUPERVISOR;PLANO FIXO;PLANO INTERNET; VENCIMENTO;VALOR;QTD;UF;CIDADE;CPF/CNPJ;DATA;NOME / RAZÃO SOCIAL;OBS;CONTATO 1;CONTATO 2;E-MAIL;FORMA DE PAG;AUDITORIA;AGENDAMENTO;INSTALAÇÃO;BRScan;;;;";
const LINE_OK =
  "PDV PADRÃO;T1000001;;;;1-100;GROSS;;BELTRANA;;-;400 MB;20;109,99;1;GO;GOIÂNIA;111.111.111-11;01/jun;CLIENTE UM;;;;;BOLETO;;;;SIM;;;;";
const LINE_LATE_INSTALL =
  "PDV PADRÃO;T1000001;;;;1-100;GROSS;;BELTRANA;;-;400 MB;20;109,99;1;GO;GOIÂNIA;111.111.111-11;01/jun;CLIENTE UM;;;;;BOLETO;;;06/10/2026 22:00;SIM;;;;";
const LINE_UNKNOWN_STATUS =
  "PDV PADRÃO;T1000001;;;;1-200;EM ROTA;;BELTRANA;;-;400 MB;20;109,99;1;GO;GOIÂNIA;222.222.222-22;01/jun;CLIENTE DOIS;;;;;BOLETO;;;;SIM;;;;";
const LINE_OTHER_DEFAULTS =
  "OUTRO PDV;T1000001;;OUTRO SISTEMA;;1-100;GROSS;;BELTRANA;;-;400 MB;20;109,99;5;GO;GOIÂNIA;111.111.111-11;01/jun;CLIENTE UM;;;;;BOLETO;;;;SIM;;;;";

function makeService(existingRows: Array<Record<string, unknown>> = []) {
  const prisma = {
    domainValue: {
      findMany: vi.fn().mockResolvedValue([
        { id: "st-1", type: "SALE_STATUS", value: "GROSS" },
        { id: "pay-1", type: "PAYMENT_METHOD", value: "BOLETO" },
        { id: "pdv-1", type: "PDV", value: "PDV PADRÃO" },
        { id: "pdv-other", type: "PDV", value: "OUTRO PDV" },
        { id: "sys-1", type: "SYSTEM", value: "SISTEMA PADRÃO" },
        { id: "sys-other", type: "SYSTEM", value: "OUTRO SISTEMA" },
      ]),
      findFirst: vi.fn().mockImplementation((args: { where: { type: string } }) => {
        if (args.where.type === "PDV") return Promise.resolve({ id: "pdv-1" });
        if (args.where.type === "SYSTEM") return Promise.resolve({ id: "sys-1" });
        return Promise.resolve(null);
      }),
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
  const prismaWithTransaction = {
    ...prisma,
    $transaction: vi
      .fn()
      .mockImplementation((fn: (tx: typeof prisma) => Promise<unknown>) =>
        fn(prismaWithTransaction),
      ),
  };
  const audit = { record: vi.fn().mockResolvedValue(undefined) };
  const config = {
    get: (key: string) =>
      ({ SALE_DEFAULT_PDV: "PDV PADRÃO", SALE_DEFAULT_SYSTEM: "SISTEMA PADRÃO" })[key],
  };
  const logger = { error: vi.fn(), log: vi.fn(), warn: vi.fn(), debug: vi.fn() };
  const svc = new ImportsService(
    prismaWithTransaction as unknown as ConstructorParameters<typeof ImportsService>[0],
    audit as unknown as ConstructorParameters<typeof ImportsService>[1],
    config as unknown as ConstructorParameters<typeof ImportsService>[2],
    logger as unknown as ConstructorParameters<typeof ImportsService>[3],
  );
  return { svc, prisma, prismaWithTransaction, audit, logger };
}

function csvBuffer(...lines: string[]): Buffer {
  return Buffer.from([HEADER, ...lines].join("\n"), "utf8");
}

describe("ImportsService.runImport", () => {
  it("creates a sale for a fully resolvable line", async () => {
    const { svc, prisma } = makeService();
    const result = await svc.runImport(csvBuffer(LINE_OK), "junho.csv", ctx);
    expect(result.stats).toEqual({
      total: 1,
      created: 1,
      updated: 0,
      skipped: 0,
      pending: 0,
      ignored: 0,
    });
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

  it("does not store lines without sale data and counts them as ignored", async () => {
    const { svc, prisma } = makeService();
    const emptyLine = `PDV PADRÃO;T1000001${";".repeat(27)}`;
    const result = await svc.runImport(csvBuffer(emptyLine, LINE_OK, emptyLine), "junho.csv", ctx);
    expect(result.stats).toEqual({
      total: 1,
      created: 1,
      updated: 0,
      skipped: 0,
      pending: 0,
      ignored: 2,
    });
    expect(prisma.importRow.create).toHaveBeenCalledTimes(1);
  });

  it("stores the spreadsheet line number, header being line 1", async () => {
    const { svc, prisma } = makeService();
    const emptyLine = `PDV PADRÃO;T1000001${";".repeat(27)}`;
    await svc.runImport(csvBuffer(LINE_OK, emptyLine, LINE_UNKNOWN_STATUS), "junho.csv", ctx);
    const lineNumbers = prisma.importRow.create.mock.calls.map((call) => call[0].data.lineNumber);
    expect(lineNumbers).toEqual([2, 4]);
  });

  it("no longer stores a year in the batch stats", async () => {
    const { svc, prisma } = makeService();
    await svc.runImport(csvBuffer(LINE_OK), "junho.csv", ctx);
    expect(prisma.importBatch.update.mock.calls[0][0].data.stats).not.toHaveProperty("year");
  });

  it("stores the installation day without shifting it for a late-evening time", async () => {
    const { svc, prisma } = makeService();
    await svc.runImport(csvBuffer(LINE_LATE_INSTALL), "junho.csv", ctx);
    const saleData = prisma.sale.create.mock.calls[0][0].data;
    expect(dateOnlyKey(saleData.installedAt)).toBe("2026-10-06");
  });

  it("forces PDV PADRÃO, SISTEMA PADRÃO and qty 1 even when the spreadsheet differs", async () => {
    const { svc, prisma } = makeService();
    const result = await svc.runImport(csvBuffer(LINE_OTHER_DEFAULTS), "junho.csv", ctx);
    expect(result.stats).toEqual({
      total: 1,
      created: 1,
      updated: 0,
      skipped: 0,
      pending: 0,
      ignored: 0,
    });
    expect(prisma.sale.create).toHaveBeenCalledTimes(1);
    const saleData = prisma.sale.create.mock.calls[0][0].data;
    expect(saleData.pdvId).toBe("pdv-1");
    expect(saleData.systemId).toBe("sys-1");
    expect(saleData.qty).toBe(1);
  });

  it("marks unknown status as pending with the pt-BR message", async () => {
    const { svc, prisma } = makeService();
    const result = await svc.runImport(csvBuffer(LINE_UNKNOWN_STATUS), "junho.csv", ctx);
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
    // The first findMany call loads known hashes; return this row's real hash.
    prisma.importRow.findMany = vi
      .fn()
      .mockResolvedValueOnce([{ rowHash: realHash }])
      .mockResolvedValue([]);
    const result = await svc.runImport(csvBuffer(LINE_OK), "junho.csv", ctx);
    expect(result.stats).toEqual({
      total: 1,
      created: 0,
      updated: 0,
      skipped: 1,
      pending: 0,
      ignored: 0,
    });
    const rowData = prisma.importRow.create.mock.calls[0][0].data;
    expect(rowData.status).toBe("SKIPPED");
    expect(rowData.message).toBe("Linha idêntica já importada");
    expect(prisma.sale.create).not.toHaveBeenCalled();
  });

  it("updates the same sale when the dedupe key matches a previous row", async () => {
    const { svc, prisma } = makeService();
    prisma.importRow.findMany = vi
      .fn()
      // Known hashes: none.
      .mockResolvedValueOnce([])
      // Previous rows by dedupeKey.
      .mockResolvedValueOnce([
        { dedupeKey: "1-100|111.111.111-11|2026-06-01", saleId: "sale-9", status: "CREATED" },
      ]);
    const result = await svc.runImport(csvBuffer(LINE_OK), "junho.csv", ctx);
    expect(result.stats.updated).toBe(1);
    expect(prisma.sale.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "sale-9" } }),
    );
    expect(prisma.sale.create).not.toHaveBeenCalled();
  });

  it("audits the batch and the created sale", async () => {
    const { svc, audit } = makeService();
    await svc.runImport(csvBuffer(LINE_OK), "junho.csv", ctx);
    const entities = audit.record.mock.calls.map((call) => call[0].entity);
    expect(entities).toContain("ImportBatch");
    expect(entities).toContain("Sale");
  });

  it("writes the customer, sale and address for a row inside a single transaction", async () => {
    const { svc, prismaWithTransaction } = makeService();
    await svc.runImport(csvBuffer(LINE_OK), "junho.csv", ctx);
    expect(prismaWithTransaction.$transaction).toHaveBeenCalledTimes(1);
  });

  it("logs the raw error and stores a fixed pt-BR message when a row fails", async () => {
    const { svc, prisma, logger } = makeService();
    const boom = new Error("db exploded");
    prisma.sale.create = vi.fn().mockRejectedValue(boom);
    const result = await svc.runImport(csvBuffer(LINE_OK), "junho.csv", ctx);
    expect(result.stats.pending).toBe(1);
    const rowData = prisma.importRow.create.mock.calls[0][0].data;
    expect(rowData.status).toBe("PENDING");
    expect(rowData.message).toBe("Erro ao importar esta linha");
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("db exploded"),
      undefined,
      "ImportsService",
    );
  });
});

describe("ImportsService.reprocess", () => {
  it("keeps the stored ignored count when recomputing stats", async () => {
    const { svc, prisma } = makeService();
    prisma.importBatch.findUnique = vi.fn().mockResolvedValue({
      id: "batch-1",
      createdAt: FIXED_NOW,
      stats: { total: 1, ignored: 3 },
      rows: [],
    });
    prisma.importRow.findMany = vi.fn().mockResolvedValue([]);
    prisma.importRow.groupBy = vi.fn().mockResolvedValue([]);

    const result = await svc.reprocess("batch-1", ctx);

    expect(result.stats.ignored).toBe(3);
    expect(prisma.importBatch.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { stats: expect.objectContaining({ ignored: 3 }) },
      }),
    );
  });

  it("defaults ignored to 0 when the stored stats lack it", async () => {
    const { svc, prisma } = makeService();
    prisma.importBatch.findUnique = vi.fn().mockResolvedValue({
      id: "batch-1",
      createdAt: FIXED_NOW,
      stats: { year: 2026 },
      rows: [],
    });
    prisma.importRow.findMany = vi.fn().mockResolvedValue([]);
    prisma.importRow.groupBy = vi.fn().mockResolvedValue([]);
    const result = await svc.reprocess("batch-1", ctx);
    expect(result.stats.ignored).toBe(0);
  });

  it("updates the pre-existing keyed sale instead of creating a new one", async () => {
    const { svc, prisma } = makeService();
    const rawRow = parseCsv(LINE_OK)[0];
    prisma.importBatch.findUnique = vi.fn().mockResolvedValue({
      id: "batch-1",
      createdAt: FIXED_NOW,
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

  it("logs the raw error and stores a fixed pt-BR message when a row fails", async () => {
    const { svc, prisma, logger } = makeService();
    const rawRow = parseCsv(LINE_OK)[0];
    prisma.importBatch.findUnique = vi.fn().mockResolvedValue({
      id: "batch-1",
      createdAt: FIXED_NOW,
      stats: { year: 2026 },
      rows: [{ id: "row-1", raw: rawRow, status: "PENDING" }],
    });
    prisma.importRow.findMany = vi.fn().mockResolvedValue([]);
    prisma.importRow.groupBy = vi
      .fn()
      .mockResolvedValue([{ status: "PENDING", _count: { _all: 1 } }]);
    const boom = new Error("db exploded");
    prisma.sale.create = vi.fn().mockRejectedValue(boom);

    await svc.reprocess("batch-1", ctx);

    expect(prisma.importRow.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "row-1" },
        data: { message: "Erro ao importar esta linha" },
      }),
    );
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("db exploded"),
      undefined,
      "ImportsService",
    );
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

    const runImportPromise = svc.runImport(csvBuffer(LINE_OK), "junho.csv", ctx);

    await expect(svc.reprocess("batch-1", ctx)).rejects.toBeInstanceOf(AppException);

    releaseBatchCreate({ id: "batch-1", createdAt: new Date() });
    const result = await runImportPromise;
    expect(result.id).toBe("batch-1");

    prisma.importBatch.findUnique = vi.fn().mockResolvedValue({
      id: "batch-1",
      createdAt: FIXED_NOW,
      stats: { year: 2026 },
      rows: [],
    });
    prisma.importRow.groupBy = vi.fn().mockResolvedValue([]);
    const reprocessResult = await svc.reprocess("batch-1", ctx);
    expect(reprocessResult.id).toBe("batch-1");
  });
});

describe("ImportsService.getBatch / listRows", () => {
  it("returns the batch with the importer and no rows", async () => {
    const { svc, prisma } = makeService();
    prisma.importBatch.findUnique = vi.fn().mockResolvedValue({ id: "batch-1" });
    await svc.getBatch("batch-1");
    expect(prisma.importBatch.findUnique).toHaveBeenCalledWith({
      where: { id: "batch-1" },
      include: { importedBy: { select: { id: true, name: true } } },
    });
  });

  it("404s for an unknown batch", async () => {
    const { svc } = makeService();
    await expect(svc.listRows("nope", {})).rejects.toBeInstanceOf(AppException);
    await expect(svc.getBatch("nope")).rejects.toBeInstanceOf(AppException);
  });

  it("paginates ordered by line number with defaults and a status filter", async () => {
    const { svc, prisma } = makeService();
    prisma.importBatch.findUnique = vi.fn().mockResolvedValue({ id: "batch-1" });
    prisma.importRow.findMany = vi.fn().mockResolvedValue([{ id: "r1" }]);
    Object.assign(prisma.importRow, { count: vi.fn().mockResolvedValue(120) });

    const result = await svc.listRows("batch-1", { status: "PENDING", page: 3 });

    expect(result).toEqual({ items: [{ id: "r1" }], total: 120, page: 3, perPage: 50 });
    expect(prisma.importRow.findMany).toHaveBeenCalledWith({
      where: { batchId: "batch-1", status: "PENDING" },
      orderBy: [{ lineNumber: "asc" }, { createdAt: "asc" }],
      skip: 100,
      take: 50,
    });
  });
});

describe("ImportsService.unresolved", () => {
  let rowCount = 0;
  const rowWith = (status: string, seller: string, supervisor = "") => {
    const cells = parseCsv(LINE_OK)[0];
    cells[6] = status;
    cells[8] = seller;
    cells[9] = supervisor;
    rowCount += 1;
    return { id: `r-${rowCount}`, raw: cells };
  };

  it("groups pending values, sorts blocking first then by rows, and returns the options", async () => {
    const { svc, prisma } = makeService();
    prisma.importBatch.findUnique = vi
      .fn()
      .mockResolvedValue({ id: "batch-1", createdAt: FIXED_NOW });
    prisma.importRow.findMany = vi
      .fn()
      .mockResolvedValue([
        rowWith("GROSS", "Fulano", "Chefe"),
        rowWith("GROSS", "FULANO", "chefe"),
        rowWith("GROSS", "Ciclano", "Chefe"),
        rowWith("EM ROTA", "BELTRANA"),
      ]);
    prisma.user.findMany = vi.fn().mockResolvedValue([{ id: "u-vit", name: "BELTRANA" }]);
    prisma.plan.findMany = vi.fn().mockResolvedValue([{ id: "plan-400", name: "400 MB" }]);
    prisma.domainValue.findMany = vi.fn().mockResolvedValue([
      { id: "st-1", type: "SALE_STATUS", value: "GROSS" },
      { id: "pay-1", type: "PAYMENT_METHOD", value: "BOLETO" },
    ]);

    const result = await svc.unresolved("batch-1");

    expect(result.values).toEqual([
      {
        kind: "USER",
        domainType: null,
        sourceValue: "Fulano",
        fields: ["seller"],
        rows: 2,
        blocking: true,
      },
      {
        kind: "USER",
        domainType: null,
        sourceValue: "Ciclano",
        fields: ["seller"],
        rows: 1,
        blocking: true,
      },
      {
        kind: "DOMAIN",
        domainType: "SALE_STATUS",
        sourceValue: "EM ROTA",
        fields: ["status"],
        rows: 1,
        blocking: true,
      },
      {
        kind: "USER",
        domainType: null,
        sourceValue: "Chefe",
        fields: ["supervisor"],
        rows: 3,
        blocking: false,
      },
    ]);
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "ACTIVE", isSuperAdmin: false },
        select: { id: true, name: true },
      }),
    );
    expect(result.options).toEqual({
      users: [{ id: "u-vit", name: "BELTRANA" }],
      plans: [{ id: "plan-400", name: "400 MB" }],
      domainValues: {
        SALE_STATUS: [{ id: "st-1", value: "GROSS" }],
        PAYMENT_METHOD: [{ id: "pay-1", value: "BOLETO" }],
        MAILING: [],
        SCHEDULE_PERIOD: [],
      },
    });
  });
});

describe("ImportsService.pendingCsvFile", () => {
  it("returns the file name without extension and the pending rows as csv", async () => {
    const { svc, prisma } = makeService();
    prisma.importBatch.findUnique = vi
      .fn()
      .mockResolvedValue({ id: "b", fileName: "junho.final.csv" });
    prisma.importRow.findMany = vi
      .fn()
      .mockResolvedValue([{ raw: parseCsv(LINE_OK)[0], message: "Status desconhecido: X" }]);
    const { fileName, csv } = await svc.pendingCsvFile("b");
    expect(fileName).toBe("junho.final");
    const parsed = parseCsv(csv);
    expect(parsed[1][29]).toBe("Status desconhecido: X");
    expect(prisma.importRow.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { batchId: "b", status: "PENDING" } }),
    );
  });
});

describe("computeBatchStats", () => {
  it("totals every status and keeps the ignored count", () => {
    const stats = computeBatchStats(
      [
        { status: "CREATED", _count: { _all: 2 } },
        { status: "UPDATED", _count: { _all: 1 } },
        { status: "SKIPPED", _count: { _all: 3 } },
        { status: "PENDING", _count: { _all: 4 } },
      ],
      5,
    );
    expect(stats).toEqual({
      total: 10,
      created: 2,
      updated: 1,
      skipped: 3,
      pending: 4,
      ignored: 5,
    });
  });
});
