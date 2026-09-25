import { saleDefaults } from "@comms-crm-core/config";
import { digitsOnly } from "@comms-crm-core/validation";
import { HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { z } from "zod";
import type { Prisma } from "../../prisma/generated/prisma/client/client";
import type { AuditContext } from "../audit/audit-context.decorator";
import { AuditService } from "../audit/audit.service";
import type { Env } from "../config";
import { type AddressSnapshot, isAddressEmpty } from "../customers/dto/address-input.dto";
import { AppException } from "../logging/app-exception";
import { ErrorCode } from "../logging/error-codes";
import { WinstonLoggerService } from "../logging/winston-logger.service";
import { PrismaService } from "../prisma";
import { ensureCatalogAddress } from "../sales/sale-address";
import { resolveFixedSaleDomains } from "../sales/sale-defaults";
import {
  type RawSaleRecord,
  assertHeader,
  decodeSpreadsheet,
  dedupeKey,
  normalizeRow,
  parseCsv,
  rowHash,
} from "./parser";
import { type ResolveCaches, type ResolvedRefs, resolveRecord } from "./resolver";

export interface BatchStats {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  pending: number;
}

const IMPORT_ROW_ERROR_MESSAGE = "Erro ao importar esta linha";

type ApplyImportRecordOutcome =
  | { kind: "blocked"; message: string }
  | { kind: "ambiguous" }
  | { kind: "applied"; saleId: string; created: boolean; message: string | null };

function unmaskDoc(value: string | null | undefined): string {
  return value ? digitsOnly(value) : "";
}

// Only `year` matters here; other stats fields are recomputed on every run.
const importBatchStatsSchema = z.object({ year: z.number() });

function readYear(value: unknown): number | undefined {
  const parsed = importBatchStatsSchema.safeParse(value);
  return parsed.success ? parsed.data.year : undefined;
}

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
      throw new AppException(
        ErrorCode.IMPORT_IN_PROGRESS,
        "Já existe uma importação em andamento",
        HttpStatus.CONFLICT,
      );
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

  async runImport(buffer: Buffer, fileName: string, year: number, ctx: AuditContext) {
    return this.withImportLock(async () => {
      const rows = parseCsv(decodeSpreadsheet(buffer));
      if (rows.length === 0) {
        throw new AppException(ErrorCode.IMPORT_FILE_REQUIRED, "Planilha vazia");
      }
      assertHeader(rows[0]);
      const dataRows = rows.slice(1);

      const fixedDomains = await resolveFixedSaleDomains(this.prisma, {
        pdv: this.config.get("SALE_DEFAULT_PDV"),
        system: this.config.get("SALE_DEFAULT_SYSTEM"),
      });

      const batch = await this.prisma.importBatch.create({
        data: { fileName, importedById: ctx.userId, stats: { year } },
      });

      const caches = await this.buildCaches();
      const [seenHashRows, keyedRows] = await Promise.all([
        this.prisma.importRow.findMany({
          where: { status: { not: "PENDING" } },
          select: { rowHash: true },
        }),
        this.prisma.importRow.findMany({
          where: { saleId: { not: null }, status: { in: ["CREATED", "UPDATED"] } },
          select: { dedupeKey: true, saleId: true },
        }),
      ]);
      const seenHashes = new Set(seenHashRows.map((row) => row.rowHash));
      const salesByKey = new Map<string, Set<string>>();
      for (const row of keyedRows) {
        if (!row.dedupeKey || !row.saleId) continue;
        const bucket = salesByKey.get(row.dedupeKey) ?? new Set<string>();
        bucket.add(row.saleId);
        salesByKey.set(row.dedupeKey, bucket);
      }

      const stats: BatchStats = {
        total: dataRows.length,
        created: 0,
        updated: 0,
        skipped: 0,
        pending: 0,
      };

      for (const cells of dataRows) {
        await this.processRow(
          cells,
          year,
          batch.id,
          caches,
          fixedDomains,
          seenHashes,
          salesByKey,
          stats,
          ctx,
        );
      }

      const updated = await this.prisma.importBatch.update({
        where: { id: batch.id },
        data: { stats: { ...stats, year } },
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

  private async processRow(
    cells: string[],
    year: number,
    batchId: string,
    caches: ResolveCaches,
    fixedDomains: { pdvId: string; systemId: string },
    seenHashes: Set<string>,
    salesByKey: Map<string, Set<string>>,
    stats: BatchStats,
    ctx: AuditContext,
  ): Promise<void> {
    const hash = rowHash(cells);
    const record = normalizeRow(cells, year);
    const key = dedupeKey(record);
    const rowBase = { batchId, rowHash: hash, dedupeKey: key, raw: cells };

    try {
      if (seenHashes.has(hash)) {
        stats.skipped += 1;
        await this.prisma.importRow.create({
          data: { ...rowBase, status: "SKIPPED", message: "Linha idêntica já importada" },
        });
        return;
      }

      const outcome = await this.applyImportRecord(
        record,
        key,
        caches,
        fixedDomains,
        salesByKey,
        batchId,
        ctx,
        {
          amount: String(record.amount),
        },
      );

      switch (outcome.kind) {
        case "blocked":
          stats.pending += 1;
          await this.prisma.importRow.create({
            data: { ...rowBase, status: "PENDING", message: outcome.message },
          });
          return;
        case "ambiguous":
          stats.pending += 1;
          await this.prisma.importRow.create({
            data: {
              ...rowBase,
              status: "PENDING",
              message: "Chave ambígua em importações anteriores",
            },
          });
          return;
        case "applied":
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
          return;
      }
    } catch (error) {
      this.logger.error(`import row failed: ${String(error)}`, undefined, ImportsService.name);
      stats.pending += 1;
      await this.prisma.importRow.create({
        data: { ...rowBase, status: "PENDING", message: IMPORT_ROW_ERROR_MESSAGE },
      });
    }
  }

  private async applyImportRecord(
    record: RawSaleRecord,
    key: string,
    caches: ResolveCaches,
    fixedDomains: { pdvId: string; systemId: string },
    salesByKey: Map<string, Set<string>>,
    batchId: string,
    ctx: AuditContext,
    auditExtra: Record<string, unknown>,
  ): Promise<ApplyImportRecordOutcome> {
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
      login: record.login,
      notes: record.notes,
      auditNote: record.auditNote,
      scheduleDate: record.scheduleDate ? new Date(record.scheduleDate) : null,
      schedulePeriodId: refs.schedulePeriodId,
      installedAt: record.installedAt ? new Date(record.installedAt) : null,
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
        throw new AppException(
          ErrorCode.IMPORT_BATCH_NOT_FOUND,
          "Lote não encontrado",
          HttpStatus.NOT_FOUND,
        );
      }
      const fixedDomains = await resolveFixedSaleDomains(this.prisma, {
        pdv: this.config.get("SALE_DEFAULT_PDV"),
        system: this.config.get("SALE_DEFAULT_SYSTEM"),
      });
      const caches = await this.buildCaches();
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

      const year = readYear(batch.stats) ?? new Date(batch.createdAt).getFullYear();

      let resolved = 0;
      for (const row of batch.rows) {
        const cells = Array.isArray(row.raw) ? row.raw.map(String) : [];
        const record = normalizeRow(cells, year);
        const key = dedupeKey(record);

        try {
          const outcome = await this.applyImportRecord(
            record,
            key,
            caches,
            fixedDomains,
            salesByKey,
            batchId,
            ctx,
            { reprocessed: true },
          );

          switch (outcome.kind) {
            case "blocked":
              await this.prisma.importRow.update({
                where: { id: row.id },
                data: { message: outcome.message },
              });
              continue;
            case "ambiguous":
              await this.prisma.importRow.update({
                where: { id: row.id },
                data: { message: "Chave ambígua em importações anteriores" },
              });
              continue;
            case "applied":
              await this.prisma.importRow.update({
                where: { id: row.id },
                data: {
                  status: outcome.created ? "CREATED" : "UPDATED",
                  saleId: outcome.saleId,
                  message: outcome.message,
                },
              });
              resolved += 1;
              continue;
          }
        } catch (error) {
          this.logger.error(
            `reprocess row failed: ${String(error)}`,
            undefined,
            ImportsService.name,
          );
          await this.prisma.importRow.update({
            where: { id: row.id },
            data: { message: IMPORT_ROW_ERROR_MESSAGE },
          });
        }
      }

      const counts = await this.prisma.importRow.groupBy({
        by: ["status"],
        where: { batchId },
        _count: { _all: true },
      });
      const newStats: BatchStats = { total: 0, created: 0, updated: 0, skipped: 0, pending: 0 };
      for (const entry of counts) {
        const count = entry._count._all;
        newStats.total += count;
        if (entry.status === "CREATED") newStats.created += count;
        if (entry.status === "UPDATED") newStats.updated += count;
        if (entry.status === "SKIPPED") newStats.skipped += count;
        if (entry.status === "PENDING") newStats.pending += count;
      }
      await this.prisma.importBatch.update({
        where: { id: batchId },
        data: { stats: { ...newStats, year } },
      });
      return { id: batchId, resolved, stats: newStats };
    });
  }

  listBatches() {
    return this.prisma.importBatch.findMany({
      orderBy: { createdAt: "desc" },
      include: { importedBy: { select: { id: true, name: true } } },
    });
  }

  async getBatch(id: string) {
    const batch = await this.prisma.importBatch.findUnique({
      where: { id },
      include: {
        importedBy: { select: { id: true, name: true } },
        rows: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!batch) {
      throw new AppException(
        ErrorCode.IMPORT_BATCH_NOT_FOUND,
        "Lote não encontrado",
        HttpStatus.NOT_FOUND,
      );
    }
    return batch;
  }
}
