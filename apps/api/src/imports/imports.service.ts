import type { AuditContext } from "@/audit/audit-context.decorator";
import { AuditService } from "@/audit/audit.service";
import type { Env } from "@/config";
import { type AddressSnapshot, isAddressEmpty } from "@/customers/dto/address-input.dto";
import { AppException } from "@/logging/app-exception";
import { ErrorCode } from "@/logging/error-codes";
import { WinstonLoggerService } from "@/logging/winston-logger.service";
import { PrismaService } from "@/prisma";
import { ensureCatalogAddress } from "@/sales/sale-address";
import { resolveFixedSaleDomains } from "@/sales/sale-defaults";
import { saleDefaults } from "@comms-crm-core/config";
import { businessDateKey, digitsOnly } from "@comms-crm-core/validation";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Prisma } from "@prisma-client";
import { z } from "zod";
import { IMPORT_ROWS_DEFAULT_PER_PAGE, type ListImportRowsQuery } from "./dto";
import { pendingCsv } from "./import-csv";
import {
  type RawSaleRecord,
  assertHeader,
  decodeSpreadsheet,
  dedupeKey,
  hasSaleData,
  normalizeRow,
  parseCsv,
  rowHash,
} from "./parser";
import {
  type ResolveCaches,
  type ResolvedRefs,
  type UnresolvedValue,
  resolveRecord,
  unresolvedValues,
} from "./resolver";

export type BatchStats = {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  pending: number;
  ignored: number;
};

const IMPORT_ROW_ERROR_MESSAGE = "Erro ao importar esta linha";

type ApplyImportRecordOutcome =
  | { kind: "blocked"; message: string }
  | { kind: "ambiguous" }
  | { kind: "applied"; saleId: string; created: boolean; message: string | null };

interface ImportRunContext {
  batchId: string;
  caches: ResolveCaches;
  fixedDomains: { pdvId: string; systemId: string };
  salesByKey: Map<string, Set<string>>;
  ctx: AuditContext;
}

interface NewImportRun extends ImportRunContext {
  today: string;
  seenHashes: Set<string>;
  stats: BatchStats;
}

const AMBIGUOUS_KEY_MESSAGE = "Chave ambígua em importações anteriores";

function pendingMessage(outcome: Exclude<ApplyImportRecordOutcome, { kind: "applied" }>): string {
  return outcome.kind === "blocked" ? outcome.message : AMBIGUOUS_KEY_MESSAGE;
}

export function computeBatchStats(
  counts: Array<{ status: string; _count: { _all: number } }>,
  ignored: number,
): BatchStats {
  const stats: BatchStats = { total: 0, created: 0, updated: 0, skipped: 0, pending: 0, ignored };
  for (const entry of counts) {
    const count = entry._count._all;
    stats.total += count;
    if (entry.status === "CREATED") stats.created += count;
    if (entry.status === "UPDATED") stats.updated += count;
    if (entry.status === "SKIPPED") stats.skipped += count;
    if (entry.status === "PENDING") stats.pending += count;
  }
  return stats;
}

function unmaskDoc(value: string | null | undefined): string {
  return value ? digitsOnly(value) : "";
}

// Only `ignored` matters here: ignored lines are not stored, so it cannot be recomputed from rows.
const importBatchStatsSchema = z.object({ ignored: z.number() });

function readIgnored(value: unknown): number {
  const parsed = importBatchStatsSchema.safeParse(value);
  return parsed.success ? parsed.data.ignored : 0;
}

export interface UnresolvedGroup {
  kind: UnresolvedValue["kind"];
  domainType: UnresolvedValue["domainType"];
  sourceValue: string;
  fields: string[];
  rows: number;
  blocking: boolean;
}

const UNRESOLVED_DOMAIN_TYPES = [
  "SALE_STATUS",
  "PAYMENT_METHOD",
  "MAILING",
  "SCHEDULE_PERIOD",
] as const;

@Injectable()
export class ImportsService {
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: ConfigService<Env, true>,
    private readonly logger: WinstonLoggerService,
  ) {}

  private async withImportLock<T>(fn: () => Promise<T>): Promise<T> {
    if (this.running) {
      throw new AppException(ErrorCode.IMPORT_IN_PROGRESS);
    }
    this.running = true;
    try {
      return await fn();
    } finally {
      this.running = false;
    }
  }

  async buildCaches(): Promise<ResolveCaches> {
    const [domainValues, users, plans, mappings] = await Promise.all([
      this.prisma.domainValue.findMany({ where: { active: true } }),
      this.prisma.user.findMany({ select: { id: true, name: true } }),
      this.prisma.plan.findMany({ select: { id: true, name: true } }),
      this.prisma.importMapping.findMany(),
    ]);
    return {
      domainValues: new Map(
        domainValues.map((row) => [`${row.type}|${row.value.toLowerCase()}`, row.id]),
      ),
      users: new Map(users.map((row) => [row.name.toLowerCase(), row.id])),
      plans: new Map(plans.map((row) => [row.name.toLowerCase(), row.id])),
      mappings: new Map(
        mappings.map((row) => [
          `${row.kind}|${row.domainType ?? ""}|${row.sourceValue.toLowerCase()}`,
          row.targetId,
        ]),
      ),
    };
  }

  private async buildSalesByKey(): Promise<Map<string, Set<string>>> {
    const keyedRows = await this.prisma.importRow.findMany({
      where: { saleId: { not: null }, status: { in: ["CREATED", "UPDATED"] } },
      select: { dedupeKey: true, saleId: true },
    });
    const salesByKey = new Map<string, Set<string>>();
    for (const row of keyedRows) {
      if (!row.dedupeKey || !row.saleId) continue;
      const bucket = salesByKey.get(row.dedupeKey) ?? new Set<string>();
      bucket.add(row.saleId);
      salesByKey.set(row.dedupeKey, bucket);
    }
    return salesByKey;
  }

  async runImport(buffer: Buffer, fileName: string, ctx: AuditContext) {
    return this.withImportLock(async () => {
      const rows = parseCsv(decodeSpreadsheet(buffer));
      if (rows.length === 0) {
        throw new AppException(ErrorCode.IMPORT_FILE_EMPTY);
      }
      assertHeader(rows[0]);
      const dataRows = rows.slice(1);

      const fixedDomains = await resolveFixedSaleDomains(this.prisma, {
        pdv: this.config.get("SALE_DEFAULT_PDV"),
        system: this.config.get("SALE_DEFAULT_SYSTEM"),
      });

      const batch = await this.prisma.importBatch.create({
        data: { fileName, importedById: ctx.userId, stats: {} },
      });

      const caches = await this.buildCaches();
      const [seenHashRows, salesByKey] = await Promise.all([
        this.prisma.importRow.findMany({
          where: { status: { not: "PENDING" } },
          select: { rowHash: true },
        }),
        this.buildSalesByKey(),
      ]);

      const stats: BatchStats = {
        total: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        pending: 0,
        ignored: 0,
      };
      const run: NewImportRun = {
        batchId: batch.id,
        caches,
        fixedDomains,
        salesByKey,
        ctx,
        today: businessDateKey(),
        seenHashes: new Set(seenHashRows.map((row) => row.rowHash)),
        stats,
      };

      for (const [index, cells] of dataRows.entries()) {
        if (!hasSaleData(cells)) {
          stats.ignored += 1;
          continue;
        }
        stats.total += 1;
        await this.processRow(run, cells, index + 2);
      }

      const updated = await this.prisma.importBatch.update({
        where: { id: batch.id },
        data: { stats },
      });
      await this.audit.record({
        entity: "ImportBatch",
        entityId: batch.id,
        action: "CREATE",
        ctx,
        after: { fileName, ...stats },
      });
      return { id: batch.id, fileName, stats, createdAt: updated.createdAt };
    });
  }

  private async processRow(run: NewImportRun, cells: string[], lineNumber: number): Promise<void> {
    const { batchId, today, seenHashes, stats } = run;
    const hash = rowHash(cells);
    const record = normalizeRow(cells, today);
    const key = dedupeKey(record);
    const rowBase = { batchId, lineNumber, rowHash: hash, dedupeKey: key, raw: cells };

    try {
      if (seenHashes.has(hash)) {
        stats.skipped += 1;
        await this.prisma.importRow.create({
          data: { ...rowBase, status: "SKIPPED", message: "Linha idêntica já importada" },
        });
        return;
      }

      const outcome = await this.applyImportRecord(run, record, key, {
        amount: String(record.amount),
      });

      if (outcome.kind !== "applied") {
        stats.pending += 1;
        await this.prisma.importRow.create({
          data: { ...rowBase, status: "PENDING", message: pendingMessage(outcome) },
        });
        return;
      }
      if (outcome.created) stats.created += 1;
      else stats.updated += 1;
      seenHashes.add(hash);
      await this.prisma.importRow.create({
        data: {
          ...rowBase,
          status: outcome.created ? "CREATED" : "UPDATED",
          message: outcome.message,
          saleId: outcome.saleId,
        },
      });
    } catch (error) {
      this.logger.error(`import row failed: ${String(error)}`, undefined, ImportsService.name);
      stats.pending += 1;
      await this.prisma.importRow.create({
        data: { ...rowBase, status: "PENDING", message: IMPORT_ROW_ERROR_MESSAGE },
      });
    }
  }

  private async applyImportRecord(
    run: ImportRunContext,
    record: RawSaleRecord,
    key: string,
    auditExtra: Record<string, unknown>,
  ): Promise<ApplyImportRecordOutcome> {
    const { batchId, caches, fixedDomains, salesByKey, ctx } = run;
    const { refs, blockers, warnings } = resolveRecord(record, caches);
    if (blockers.length > 0) {
      return { kind: "blocked", message: [...blockers, ...warnings].join("; ") };
    }

    const priorSales = salesByKey.get(key);
    if (priorSales && priorSales.size > 1) {
      return { kind: "ambiguous" };
    }
    const priorSaleId = priorSales && priorSales.size === 1 ? [...priorSales][0] : null;
    const message = warnings.length > 0 ? warnings.join("; ") : null;

    const { saleId, created } = await this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.upsert({
        where: { cpfCnpj: unmaskDoc(record.cpfCnpj) },
        update: this.customerData(record),
        create: { cpfCnpj: unmaskDoc(record.cpfCnpj), ...this.customerData(record) },
      });

      if (priorSaleId) {
        await tx.sale.update({
          where: { id: priorSaleId },
          data: this.saleData(record, refs, fixedDomains),
        });
        await this.persistImportAddress(tx, customer.id, priorSaleId, record);
        return { saleId: priorSaleId, created: false };
      }

      const sale = await tx.sale.create({
        data: { customerId: customer.id, ...this.saleData(record, refs, fixedDomains) },
      });
      await this.persistImportAddress(tx, customer.id, sale.id, record);
      return { saleId: sale.id, created: true };
    });

    if (created) {
      const bucket = salesByKey.get(key) ?? new Set<string>();
      bucket.add(saleId);
      salesByKey.set(key, bucket);
    }

    await this.audit.record({
      entity: "Sale",
      entityId: saleId,
      action: created ? "CREATE" : "UPDATE",
      ctx,
      after: { importBatchId: batchId, ...auditExtra },
    });

    return { kind: "applied", saleId, created, message };
  }

  private customerData(record: RawSaleRecord) {
    return {
      name: record.customerName ?? "",
      email: record.email,
      phone1: record.phone1 ? digitsOnly(record.phone1) : record.phone1,
      phone2: record.phone2 ? digitsOnly(record.phone2) : record.phone2,
    };
  }

  private importAddressSnapshot(record: RawSaleRecord): AddressSnapshot {
    return {
      postalCode: null,
      street: null,
      number: null,
      noNumber: false,
      complement: null,
      neighborhood: null,
      city: record.city,
      state: record.state,
    };
  }

  private async persistImportAddress(
    tx: Prisma.TransactionClient,
    customerId: string,
    saleId: string,
    record: RawSaleRecord,
  ) {
    const snapshot = this.importAddressSnapshot(record);
    if (isAddressEmpty(snapshot)) return;
    await ensureCatalogAddress(tx, customerId, snapshot);
    await tx.saleAddress.upsert({
      where: { saleId },
      create: { saleId, ...snapshot },
      update: snapshot,
    });
  }

  private saleData(
    record: RawSaleRecord,
    refs: ResolvedRefs,
    fixedDomains: { pdvId: string; systemId: string },
  ) {
    return {
      statusId: refs.statusId ?? "",
      paymentMethodId: refs.paymentMethodId,
      systemId: fixedDomains.systemId,
      mailingId: refs.mailingId,
      pdvId: fixedDomains.pdvId,
      sellerId: refs.sellerId ?? "",
      supervisorId: refs.supervisorId,
      bkoId: refs.bkoId,
      auditorId: refs.auditorId,
      planId: refs.planId,
      amount: record.amount ?? 0,
      qty: saleDefaults.qty,
      dueDay: record.dueDay,
      date: new Date(record.date ?? ""),
      orderNumber: record.orderNumber,
      notes: record.notes,
      auditNote: record.auditNote,
      scheduleDate: record.scheduleDate ? new Date(record.scheduleDate) : null,
      schedulePeriodId: refs.schedulePeriodId,
      installedAt: record.installedAt ? new Date(record.installedAt.slice(0, 10)) : null,
      brscan: record.brscan,
    };
  }

  async reprocess(batchId: string, ctx: AuditContext) {
    return this.withImportLock(async () => {
      const batch = await this.prisma.importBatch.findUnique({
        where: { id: batchId },
        include: { rows: { where: { status: "PENDING" } } },
      });
      if (!batch) {
        throw new AppException(ErrorCode.IMPORT_BATCH_NOT_FOUND);
      }
      const fixedDomains = await resolveFixedSaleDomains(this.prisma, {
        pdv: this.config.get("SALE_DEFAULT_PDV"),
        system: this.config.get("SALE_DEFAULT_SYSTEM"),
      });
      const caches = await this.buildCaches();
      const run: ImportRunContext = {
        batchId,
        caches,
        fixedDomains,
        salesByKey: await this.buildSalesByKey(),
        ctx,
      };
      const today = businessDateKey(batch.createdAt);

      let resolved = 0;
      for (const row of batch.rows) {
        if (await this.reprocessRow(run, row, today)) resolved += 1;
      }

      const counts = await this.prisma.importRow.groupBy({
        by: ["status"],
        where: { batchId },
        _count: { _all: true },
      });
      const newStats = computeBatchStats(counts, readIgnored(batch.stats));
      await this.prisma.importBatch.update({
        where: { id: batchId },
        data: { stats: newStats },
      });
      return { id: batchId, resolved, stats: newStats };
    });
  }

  private async reprocessRow(
    run: ImportRunContext,
    row: { id: string; raw: Prisma.JsonValue },
    today: string,
  ): Promise<boolean> {
    const cells = Array.isArray(row.raw) ? row.raw.map(String) : [];
    const record = normalizeRow(cells, today);
    const key = dedupeKey(record);

    try {
      const outcome = await this.applyImportRecord(run, record, key, { reprocessed: true });

      if (outcome.kind !== "applied") {
        await this.prisma.importRow.update({
          where: { id: row.id },
          data: { message: pendingMessage(outcome) },
        });
        return false;
      }
      await this.prisma.importRow.update({
        where: { id: row.id },
        data: {
          status: outcome.created ? "CREATED" : "UPDATED",
          saleId: outcome.saleId,
          message: outcome.message,
        },
      });
      return true;
    } catch (error) {
      this.logger.error(`reprocess row failed: ${String(error)}`, undefined, ImportsService.name);
      await this.prisma.importRow.update({
        where: { id: row.id },
        data: { message: IMPORT_ROW_ERROR_MESSAGE },
      });
      return false;
    }
  }

  listBatches() {
    return this.prisma.importBatch.findMany({
      orderBy: { createdAt: "desc" },
      include: { importedBy: { select: { id: true, name: true } } },
    });
  }

  private async findBatchOrThrow(id: string) {
    const batch = await this.prisma.importBatch.findUnique({
      where: { id },
      include: { importedBy: { select: { id: true, name: true } } },
    });
    if (!batch) {
      throw new AppException(ErrorCode.IMPORT_BATCH_NOT_FOUND);
    }
    return batch;
  }

  getBatch(id: string) {
    return this.findBatchOrThrow(id);
  }

  async listRows(id: string, query: ListImportRowsQuery) {
    await this.findBatchOrThrow(id);
    const page = query.page ?? 1;
    const perPage = query.perPage ?? IMPORT_ROWS_DEFAULT_PER_PAGE;
    const where: Prisma.ImportRowWhereInput = {
      batchId: id,
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.importRow.findMany({
        where,
        orderBy: [{ lineNumber: "asc" }, { createdAt: "asc" }],
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.importRow.count({ where }),
    ]);
    return { items, total, page, perPage };
  }

  async unresolved(id: string) {
    const batch = await this.findBatchOrThrow(id);
    const today = businessDateKey(batch.createdAt);
    const [rows, caches, users, plans, domainValues] = await Promise.all([
      this.prisma.importRow.findMany({
        where: { batchId: id, status: "PENDING" },
        select: { id: true, raw: true },
      }),
      this.buildCaches(),
      this.prisma.user.findMany({
        where: { status: "ACTIVE", isSuperAdmin: false },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      this.prisma.plan.findMany({
        where: { active: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      this.prisma.domainValue.findMany({
        where: { active: true, type: { in: [...UNRESOLVED_DOMAIN_TYPES] } },
        select: { id: true, type: true, value: true },
        orderBy: [{ order: "asc" }, { value: "asc" }],
      }),
    ]);

    const groups = new Map<string, UnresolvedGroup>();
    for (const row of rows) {
      const cells = Array.isArray(row.raw) ? row.raw.map(String) : [];
      const record = normalizeRow(cells, today);
      const countedKeys = new Set<string>();
      for (const value of unresolvedValues(record, caches)) {
        const key = `${value.kind}|${value.domainType ?? ""}|${value.sourceValue.toLowerCase()}`;
        const group = groups.get(key) ?? {
          kind: value.kind,
          domainType: value.domainType,
          sourceValue: value.sourceValue,
          fields: [],
          rows: 0,
          blocking: false,
        };
        if (!group.fields.includes(value.field)) group.fields.push(value.field);
        if (!countedKeys.has(key)) {
          group.rows += 1;
          countedKeys.add(key);
        }
        group.blocking = group.blocking || value.blocking;
        groups.set(key, group);
      }
    }

    const values = [...groups.values()].sort(
      (a, b) => Number(b.blocking) - Number(a.blocking) || b.rows - a.rows,
    );
    return {
      values,
      options: {
        users,
        plans,
        domainValues: {
          SALE_STATUS: domainOptions(domainValues, "SALE_STATUS"),
          PAYMENT_METHOD: domainOptions(domainValues, "PAYMENT_METHOD"),
          MAILING: domainOptions(domainValues, "MAILING"),
          SCHEDULE_PERIOD: domainOptions(domainValues, "SCHEDULE_PERIOD"),
        },
      },
    };
  }

  async pendingCsvFile(id: string) {
    const batch = await this.findBatchOrThrow(id);
    const rows = await this.prisma.importRow.findMany({
      where: { batchId: id, status: "PENDING" },
      orderBy: [{ lineNumber: "asc" }, { createdAt: "asc" }],
      select: { raw: true, message: true },
    });
    const csv = pendingCsv(
      rows.map((row) => ({
        raw: Array.isArray(row.raw) ? row.raw.map(String) : [],
        message: row.message,
      })),
    );
    return { fileName: batch.fileName.replace(/\.[^.]*$/, ""), csv };
  }
}

function domainOptions(
  values: Array<{ id: string; type: string; value: string }>,
  type: string,
): Array<{ id: string; value: string }> {
  return values.filter((row) => row.type === type).map(({ id, value }) => ({ id, value }));
}
