import { saleDefaults } from "@comms-crm-core/config";
import { HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AuditContext } from "../audit/audit-context.decorator";
import { AuditService } from "../audit/audit.service";
import { buildDateRangeWhere } from "../common/date-range";
import type { Env } from "../config";
import { withVisibleSaleDocument } from "../customers/document-visibility";
import { AppException } from "../logging/app-exception";
import { ErrorCode } from "../logging/error-codes";
import { NotificationsService } from "../notifications";
import type { PermissionSubject } from "../permissions/permissions.service";
import { PermissionsService } from "../permissions/permissions.service";
import { PrismaService } from "../prisma";
import {
  type DirectDebitData,
  EMPTY_BANK_DATA,
  isDirectDebit,
  resolveDirectDebit,
} from "./direct-debit";
import { CreateSaleDto, ListSalesQuery, UpdateSaleDto } from "./dto";
import { assertNewAddressComplete, attachSaleAddress, upsertCustomer } from "./sale-address";
import { resolveFixedSaleDomains } from "./sale-defaults";
import { humanizeDiff, resolveHistoryReferenceNames } from "./sale-history";
import { SALE_DETAIL_INCLUDE, SALE_INCLUDE } from "./sale-includes";

export type SaleActor = PermissionSubject & { id: string; name: string };

function persistOptionalDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (!value) return null;
  return new Date(value);
}

@Injectable()
export class SalesService {
  private readonly LOCKED_FIELDS = ["pdvId", "login"] as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly permissions: PermissionsService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private fixedDomainNames() {
    return {
      pdv: this.config.get("SALE_DEFAULT_PDV"),
      system: this.config.get("SALE_DEFAULT_SYSTEM"),
    };
  }

  async create(dto: CreateSaleDto, actor: SaleActor, ctx: AuditContext) {
    if (!dto.planId) {
      throw new AppException(ErrorCode.SALE_PLAN_REQUIRED, "Selecione um plano");
    }

    const pricingPlan = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
    if (!pricingPlan || !pricingPlan.active) {
      throw new AppException(ErrorCode.DOMAIN_VALUE_INVALID, "Plano inválido ou inativo");
    }
    this.assertAmountInRange(dto.amount, pricingPlan);

    await this.assertDomainValue(dto.statusId, "SALE_STATUS");
    if (!dto.paymentMethodId) {
      throw new AppException(
        ErrorCode.SALE_PAYMENT_METHOD_REQUIRED,
        "Selecione a forma de pagamento",
      );
    }
    const payment = await this.assertDomainValue(dto.paymentMethodId, "PAYMENT_METHOD");
    const bankData = isDirectDebit(payment.value) ? resolveDirectDebit(dto) : EMPTY_BANK_DATA;
    if (dto.mailingId) await this.assertDomainValue(dto.mailingId, "MAILING");
    if (dto.schedulePeriodId) await this.assertDomainValue(dto.schedulePeriodId, "SCHEDULE_PERIOD");
    if (!dto.customer.customerAddressId) {
      assertNewAddressComplete(dto.customer.address);
    }

    const { pdvId, systemId } = await resolveFixedSaleDomains(this.prisma, this.fixedDomainNames());
    const sellerId = this.resolveSeller(dto.sellerId, actor);
    const date = this.resolveSaleDate(dto.date, actor);

    const sale = await this.prisma.$transaction(async (tx) => {
      const customer = await upsertCustomer(tx, dto.customer);
      const created = await tx.sale.create({
        data: {
          customerId: customer.id,
          statusId: dto.statusId,
          paymentMethodId: dto.paymentMethodId,
          systemId,
          mailingId: dto.mailingId ?? null,
          pdvId,
          sellerId,
          supervisorId: dto.supervisorId ?? null,
          bkoId: dto.bkoId ?? null,
          auditorId: dto.auditorId ?? null,
          planId: dto.planId,
          amount: dto.amount,
          qty: saleDefaults.qty,
          dueDay: dto.dueDay ?? null,
          date,
          orderNumber: dto.orderNumber ?? null,
          login: dto.login ?? null,
          notes: dto.notes ?? null,
          auditNote: dto.auditNote ?? null,
          scheduleDate: dto.scheduleDate ? new Date(dto.scheduleDate) : null,
          schedulePeriodId: dto.schedulePeriodId || null,
          installedAt: dto.installedAt ? new Date(dto.installedAt) : null,
          brscan: dto.brscan ?? null,
          ...bankData,
        },
        include: SALE_INCLUDE,
      });
      await attachSaleAddress(tx, created.id, customer.id, dto.customer);
      return created;
    });

    await this.audit.record({
      entity: "Sale",
      entityId: sale.id,
      action: "CREATE",
      ctx,
      after: { id: sale.id, amount: String(dto.amount), statusId: dto.statusId, sellerId },
    });
    return withVisibleSaleDocument(sale, actor);
  }

  async update(id: string, dto: UpdateSaleDto, actor: SaleActor, ctx: AuditContext) {
    const before = await this.detail(id, actor);
    this.permissions.check(actor, ["sales.edit"]);

    const touchesLocked = this.LOCKED_FIELDS.some(
      (field) => dto[field] !== undefined && dto[field] !== before[field],
    );
    if (touchesLocked) this.permissions.check(actor, ["sales.edit_locked_fields"]);

    const nextPlanId = dto.planId !== undefined ? dto.planId : before.planId;
    if (!nextPlanId) {
      throw new AppException(ErrorCode.SALE_PLAN_REQUIRED, "Selecione um plano");
    }
    const nextAmount = dto.amount ?? Number(before.amount);
    if (dto.planId !== undefined || dto.amount !== undefined) {
      const plan = await this.prisma.plan.findUnique({ where: { id: nextPlanId } });
      if (!plan || !plan.active) {
        throw new AppException(ErrorCode.DOMAIN_VALUE_INVALID, "Plano inválido ou inativo");
      }
      this.assertAmountInRange(nextAmount, plan);
    }

    let bankData: DirectDebitData | typeof EMPTY_BANK_DATA | undefined;
    if (dto.paymentMethodId) {
      const payment = await this.assertDomainValue(dto.paymentMethodId, "PAYMENT_METHOD");
      bankData = isDirectDebit(payment.value)
        ? resolveDirectDebit({
            bankCode: dto.bankCode ?? before.bankCode,
            bankAgency: dto.bankAgency ?? before.bankAgency,
            bankAgencyDigit: dto.bankAgencyDigit ?? before.bankAgencyDigit,
            bankAccount: dto.bankAccount ?? before.bankAccount,
            bankAccountDigit: dto.bankAccountDigit ?? before.bankAccountDigit,
            bankAccountType: dto.bankAccountType ?? before.bankAccountType,
            accountHolderIsCustomer: dto.accountHolderIsCustomer ?? before.accountHolderIsCustomer,
            accountHolderName: dto.accountHolderName ?? before.accountHolderName,
            accountHolderCpf: dto.accountHolderCpf ?? before.accountHolderCpf,
          })
        : EMPTY_BANK_DATA;
    }
    if (dto.mailingId) await this.assertDomainValue(dto.mailingId, "MAILING");
    if (dto.schedulePeriodId) await this.assertDomainValue(dto.schedulePeriodId, "SCHEDULE_PERIOD");
    const wasBrscanApproved = before.brscan === true;
    const isBrscanChanged = dto.brscan !== undefined && dto.brscan !== wasBrscanApproved;
    if (isBrscanChanged) this.permissions.check(actor, ["sales.audit"]);
    const nextBrscan = dto.brscan ? true : null;

    const { pdvId, systemId } = await resolveFixedSaleDomains(this.prisma, this.fixedDomainNames());
    const {
      date,
      scheduleDate,
      schedulePeriodId,
      installedAt,
      bankCode,
      bankAgency,
      bankAgencyDigit,
      bankAccount,
      bankAccountDigit,
      bankAccountType,
      accountHolderIsCustomer,
      accountHolderName,
      accountHolderCpf,
      brscan,
      ...rest
    } = dto;
    const sale = await this.prisma.sale.update({
      where: { id },
      data: {
        ...rest,
        brscan: isBrscanChanged ? nextBrscan : undefined,
        pdvId,
        systemId,
        qty: saleDefaults.qty,
        date: date ? new Date(date) : undefined,
        scheduleDate: persistOptionalDate(scheduleDate),
        schedulePeriodId: schedulePeriodId === undefined ? undefined : schedulePeriodId || null,
        installedAt: persistOptionalDate(installedAt),
        ...bankData,
      },
      include: SALE_INCLUDE,
    });

    await this.audit.record({
      entity: "Sale",
      entityId: id,
      action: "UPDATE",
      ctx,
      before: {
        amount: String(before.amount),
        statusId: before.statusId,
        pdvId: before.pdvId,
        ...(isBrscanChanged ? { brscan: before.brscan } : {}),
      },
      after: {
        amount: String(nextAmount),
        statusId: sale.statusId,
        pdvId: sale.pdvId,
        ...(isBrscanChanged ? { brscan: nextBrscan } : {}),
      },
    });
    await this.notifications.notifySaleChange({
      saleId: id,
      customerName: before.customer.name,
      kind: "update",
      detail: "Venda editada",
      actorId: actor.id,
      actorName: actor.name,
      sellerId: before.sellerId,
    });
    return withVisibleSaleDocument(sale, actor);
  }

  async setAudit(id: string, ok: boolean, actor: SaleActor, ctx: AuditContext) {
    const before = await this.detail(id, actor);
    this.permissions.check(actor, ["sales.audit"]);
    const auditNote = ok ? "OK" : null;
    const sale = await this.prisma.sale.update({
      where: { id },
      data: { auditNote },
      include: SALE_INCLUDE,
    });
    await this.audit.record({
      entity: "Sale",
      entityId: id,
      action: "UPDATE",
      ctx,
      before: { auditNote: before.auditNote },
      after: { auditNote },
    });
    return withVisibleSaleDocument(sale, actor);
  }

  async setBrscan(id: string, approved: boolean, actor: SaleActor, ctx: AuditContext) {
    const before = await this.detail(id, actor);
    this.permissions.check(actor, ["sales.audit"]);
    const brscan = approved ? true : null;
    const sale = await this.prisma.sale.update({
      where: { id },
      data: { brscan },
      include: SALE_INCLUDE,
    });
    await this.audit.record({
      entity: "Sale",
      entityId: id,
      action: "UPDATE",
      ctx,
      before: { brscan: before.brscan },
      after: { brscan },
    });
    return withVisibleSaleDocument(sale, actor);
  }

  async setStatus(id: string, statusId: string, actor: SaleActor, ctx: AuditContext) {
    const before = await this.detail(id, actor);
    this.permissions.check(actor, ["sales.change_status"]);
    await this.assertDomainValue(statusId, "SALE_STATUS");
    const sale = await this.prisma.sale.update({
      where: { id },
      data: { statusId },
      include: SALE_INCLUDE,
    });
    await this.audit.record({
      entity: "Sale",
      entityId: id,
      action: "UPDATE",
      ctx,
      before: { statusId: before.statusId },
      after: { statusId },
    });
    await this.notifications.notifySaleChange({
      saleId: id,
      customerName: before.customer.name,
      kind: "status",
      detail: `${before.status.value} → ${sale.status.value}`,
      actorId: actor.id,
      actorName: actor.name,
      sellerId: before.sellerId,
    });
    return withVisibleSaleDocument(sale, actor);
  }

  async setSeller(id: string, sellerId: string, actor: SaleActor, ctx: AuditContext) {
    const before = await this.detail(id, actor);
    this.permissions.check(actor, ["sales.change_seller"]);
    const sale = await this.prisma.sale.update({
      where: { id },
      data: { sellerId },
      include: SALE_INCLUDE,
    });
    await this.audit.record({
      entity: "Sale",
      entityId: id,
      action: "UPDATE",
      ctx,
      before: { sellerId: before.sellerId },
      after: { sellerId },
    });
    await this.notifications.notifySaleChange({
      saleId: id,
      customerName: before.customer.name,
      kind: "seller",
      detail: `${before.seller.name} → ${sale.seller.name}`,
      actorId: actor.id,
      actorName: actor.name,
      sellerId,
      previousSellerId: before.sellerId,
    });
    return withVisibleSaleDocument(sale, actor);
  }

  async cancel(id: string, reason: string, actor: SaleActor, ctx: AuditContext) {
    const before = await this.detail(id, actor);
    this.permissions.check(actor, ["sales.change_status"]);
    if (before.canceledAt) {
      throw new AppException(ErrorCode.SALE_ALREADY_CANCELED, "Venda já cancelada");
    }
    const canceled = await this.prisma.domainValue.findFirst({
      where: { type: "SALE_STATUS", value: "CANCELADA", active: true },
    });
    if (!canceled) {
      throw new AppException(
        ErrorCode.DOMAIN_VALUE_INVALID,
        "Status CANCELADA não cadastrado nas configurações",
      );
    }
    const sale = await this.prisma.sale.update({
      where: { id },
      data: {
        statusId: canceled.id,
        cancelReason: reason,
        canceledById: actor.id,
        canceledAt: new Date(),
      },
      include: SALE_INCLUDE,
    });
    await this.audit.record({
      entity: "Sale",
      entityId: id,
      action: "UPDATE",
      ctx,
      before: { statusId: before.statusId, canceledAt: null },
      after: { statusId: canceled.id, cancelReason: reason },
    });
    await this.notifications.notifySaleChange({
      saleId: id,
      customerName: before.customer.name,
      kind: "cancel",
      detail: reason,
      actorId: actor.id,
      actorName: actor.name,
      sellerId: before.sellerId,
    });
    return withVisibleSaleDocument(sale, actor);
  }

  private canViewAll(actor: SaleActor): boolean {
    return this.permissions.has(actor, "sales.view_all");
  }

  async list(query: ListSalesQuery, actor: SaleActor) {
    const page = query.page ?? 1;
    const perPage = Math.min(query.perPage ?? 20, 100);

    const where: Record<string, unknown> = {};
    if (query.statusId) where.statusId = query.statusId;
    if (query.planId) where.planId = query.planId;
    if (query.city) {
      where.address = { city: { contains: query.city, mode: "insensitive" } };
    }
    const dateRange = buildDateRangeWhere(query.from, query.to);
    if (dateRange) where.date = dateRange;
    where.sellerId = this.canViewAll(actor) ? (query.sellerId ?? undefined) : actor.id;

    const [items, total] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        include: SALE_INCLUDE,
        orderBy: { date: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.sale.count({ where }),
    ]);
    return {
      items: items.map((sale) => withVisibleSaleDocument(sale, actor)),
      total,
      page,
      perPage,
    };
  }

  async detail(id: string, actor: SaleActor) {
    const sale = await this.prisma.sale.findUnique({ where: { id }, include: SALE_DETAIL_INCLUDE });
    if (!sale) {
      throw new AppException(
        ErrorCode.SALE_NOT_FOUND,
        "Venda não encontrada",
        HttpStatus.NOT_FOUND,
      );
    }
    if (!this.canViewAll(actor) && sale.sellerId !== actor.id) {
      throw new AppException(
        ErrorCode.FORBIDDEN,
        "Sem permissão: sales.view_all",
        HttpStatus.FORBIDDEN,
      );
    }
    return withVisibleSaleDocument(sale, actor);
  }

  async history(id: string, actor: SaleActor) {
    await this.detail(id, actor);
    const entries = await this.prisma.auditLog.findMany({
      where: { entity: "Sale", entityId: id },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true } } },
    });
    const nameById = await resolveHistoryReferenceNames(
      this.prisma,
      entries.map((entry) => entry.diff),
    );
    return entries.map((entry) => ({
      ...entry,
      diff: humanizeDiff(entry.diff, entry.action, nameById),
    }));
  }

  private assertAmountInRange(
    amount: number,
    plan: { basePrice: unknown; minPrice: unknown },
  ): void {
    const min = Number(plan.minPrice);
    const max = Number(plan.basePrice);
    if (amount < min || amount > max) {
      throw new AppException(ErrorCode.SALE_AMOUNT_OUT_OF_RANGE, "Valor fora da faixa do plano");
    }
  }

  private resolveSeller(requestedSellerId: string | undefined, actor: SaleActor): string {
    if (!requestedSellerId || requestedSellerId === actor.id) return actor.id;
    this.permissions.check(actor, ["sales.change_seller"]);
    return requestedSellerId;
  }

  private resolveSaleDate(requestedDate: string, actor: SaleActor): Date {
    if (this.permissions.has(actor, "sales.edit")) return new Date(requestedDate);
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return new Date(`${today.getFullYear()}-${month}-${day}`);
  }

  private async assertDomainValue(id: string, type: string) {
    const value = await this.prisma.domainValue.findUnique({ where: { id } });
    if (!value || value.type !== type || !value.active) {
      throw new AppException(
        ErrorCode.DOMAIN_VALUE_INVALID,
        "Valor de domínio inválido ou inativo",
        HttpStatus.BAD_REQUEST,
      );
    }
    return value;
  }
}
