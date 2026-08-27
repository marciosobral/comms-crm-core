import { HttpStatus, Injectable } from "@nestjs/common";
import type { AuditContext } from "../audit/audit-context.decorator";
import { AuditService } from "../audit/audit.service";
import { AppException } from "../logging/app-exception";
import { ErrorCode } from "../logging/error-codes";
import { PrismaService } from "../prisma";
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

function readYear(value: unknown): number | undefined {
  if (typeof value !== "object" || value === null || !("year" in value)) {
    return undefined;
  }
  const year = Reflect.get(value, "year");
  return typeof year === "number" ? year : undefined;
}

@Injectable()
export class ImportsService {
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
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
        await this.processRow(cells, year, batch.id, caches, seenHashes, salesByKey, stats, ctx);
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

      const { refs, blockers, warnings } = resolveRecord(record, caches);
      if (blockers.length > 0) {
        stats.pending += 1;
        await this.prisma.importRow.create({
          data: { ...rowBase, status: "PENDING", message: [...blockers, ...warnings].join("; ") },
        });
        return;
      }

      const priorSales = salesByKey.get(key);
      if (priorSales && priorSales.size > 1) {
        stats.pending += 1;
        await this.prisma.importRow.create({
          data: {
            ...rowBase,
            status: "PENDING",
            message: "Chave ambígua em importações anteriores",
          },
        });
        return;
      }

      const message = warnings.length > 0 ? warnings.join("; ") : null;

      if (priorSales && priorSales.size === 1) {
        const saleId = [...priorSales][0];
        await this.prisma.sale.update({ where: { id: saleId }, data: this.saleData(record, refs) });
        stats.updated += 1;
        seenHashes.add(hash);
        await this.prisma.importRow.create({
          data: { ...rowBase, status: "UPDATED", message, saleId },
        });
        await this.audit.record({
          entity: "Sale",
          entityId: saleId,
          action: "UPDATE",
          ctx,
          after: { importBatchId: batchId, amount: String(record.amount) },
        });
        return;
      }

      const customer = await this.prisma.customer.upsert({
        where: { cpfCnpj: record.cpfCnpj ?? "" },
        update: this.customerData(record),
        create: { cpfCnpj: record.cpfCnpj ?? "", ...this.customerData(record) },
      });
      const sale = await this.prisma.sale.create({
        data: { customerId: customer.id, ...this.saleData(record, refs) },
      });
      stats.created += 1;
      seenHashes.add(hash);
      const bucket = salesByKey.get(key) ?? new Set<string>();
      bucket.add(sale.id);
      salesByKey.set(key, bucket);
      await this.prisma.importRow.create({
        data: { ...rowBase, status: "CREATED", message, saleId: sale.id },
      });
      await this.audit.record({
        entity: "Sale",
        entityId: sale.id,
        action: "CREATE",
        ctx,
        after: { importBatchId: batchId, amount: String(record.amount) },
      });
    } catch (error) {
      stats.pending += 1;
      await this.prisma.importRow.create({
        data: { ...rowBase, status: "PENDING", message: `Erro ao importar: ${String(error)}` },
      });
    }
  }

  private customerData(record: RawSaleRecord) {
    return {
      name: record.customerName ?? "",
      city: record.city,
      state: record.state,
      email: record.email,
      phone1: record.phone1,
      phone2: record.phone2,
    };
  }

  private saleData(record: RawSaleRecord, refs: ResolvedRefs) {
    return {
      statusId: refs.statusId ?? "",
      paymentMethodId: refs.paymentMethodId,
      systemId: refs.systemId,
      mailingId: refs.mailingId,
      pdvId: refs.pdvId,
      sellerId: refs.sellerId ?? "",
      supervisorId: refs.supervisorId,
      bkoId: refs.bkoId,
      auditorId: refs.auditorId,
      internetPlanId: refs.internetPlanId,
      fixedPlanId: refs.fixedPlanId,
      amount: record.amount ?? 0,
      qty: record.qty,
      dueDay: record.dueDay,
      date: new Date(record.date ?? ""),
      orderNumber: record.orderNumber,
      login: record.login,
      notes: record.notes,
      auditNote: record.auditNote,
      scheduleStart: record.scheduleStart ? new Date(record.scheduleStart) : null,
      scheduleEnd: record.scheduleEnd ? new Date(record.scheduleEnd) : null,
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
        const { refs, blockers, warnings } = resolveRecord(record, caches);
        if (blockers.length > 0) {
          await this.prisma.importRow.update({
            where: { id: row.id },
            data: { message: [...blockers, ...warnings].join("; ") },
          });
          continue;
        }

        const priorSales = salesByKey.get(key);
        if (priorSales && priorSales.size > 1) {
          await this.prisma.importRow.update({
            where: { id: row.id },
            data: { message: "Chave ambígua em importações anteriores" },
          });
          continue;
        }

        const message = warnings.length > 0 ? warnings.join("; ") : null;

        try {
          if (priorSales && priorSales.size === 1) {
            const saleId = [...priorSales][0];
            await this.prisma.sale.update({
              where: { id: saleId },
              data: this.saleData(record, refs),
            });
            await this.prisma.importRow.update({
              where: { id: row.id },
              data: { status: "UPDATED", saleId, message },
            });
            await this.audit.record({
              entity: "Sale",
              entityId: saleId,
              action: "UPDATE",
              ctx,
              after: { importBatchId: batchId, reprocessed: true },
            });
            resolved += 1;
            continue;
          }

          const customer = await this.prisma.customer.upsert({
            where: { cpfCnpj: record.cpfCnpj ?? "" },
            update: this.customerData(record),
            create: { cpfCnpj: record.cpfCnpj ?? "", ...this.customerData(record) },
          });
          const sale = await this.prisma.sale.create({
            data: { customerId: customer.id, ...this.saleData(record, refs) },
          });
          await this.prisma.importRow.update({
            where: { id: row.id },
            data: { status: "CREATED", saleId: sale.id, message },
          });
          await this.audit.record({
            entity: "Sale",
            entityId: sale.id,
            action: "CREATE",
            ctx,
            after: { importBatchId: batchId, reprocessed: true },
          });
          resolved += 1;
          const bucket = salesByKey.get(key) ?? new Set<string>();
          bucket.add(sale.id);
          salesByKey.set(key, bucket);
        } catch (error) {
          await this.prisma.importRow.update({
            where: { id: row.id },
            data: { message: `Erro ao importar: ${String(error)}` },
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
