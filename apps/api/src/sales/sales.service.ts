import { saleDefaults } from "@comms-core/config";
import { HttpStatus, Injectable } from "@nestjs/common";
import type { AuditContext } from "../audit/audit-context.decorator";
import { AuditService } from "../audit/audit.service";
import { withVisibleSaleDocument } from "../customers/document-visibility";
import {
  type AddressSnapshot,
  addressDedupeKey,
  addressSnapshotFromInput,
  isAddressEmpty,
} from "../customers/dto/address-input.dto";
import { AppException } from "../logging/app-exception";
import { ErrorCode } from "../logging/error-codes";
import { NotificationsService } from "../notifications";
import type { PermissionSubject } from "../permissions/permissions.service";
import { PermissionsService } from "../permissions/permissions.service";
import { PrismaService } from "../prisma";
import { CreateSaleDto, CustomerInputDto, ListSalesQuery, UpdateSaleDto } from "./dto";
import { resolveFixedSaleDomains } from "./sale-defaults";
import { collectReferenceIds, humanizeDiff } from "./sale-history";
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
  ) {}

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
    if (dto.paymentMethodId) {
      const payment = await this.assertDomainValue(dto.paymentMethodId, "PAYMENT_METHOD");
      this.assertBankData(payment.value, dto);
    }
    if (dto.mailingId) await this.assertDomainValue(dto.mailingId, "MAILING");
    if (dto.schedulePeriodId) await this.assertDomainValue(dto.schedulePeriodId, "SCHEDULE_PERIOD");

    const { pdvId, systemId } = await resolveFixedSaleDomains(this.prisma);
    const sellerId = this.resolveSeller(dto.sellerId, actor);
    const customer = await this.upsertCustomer(dto.customer);

    const sale = await this.prisma.sale.create({
      data: {
        customerId: customer.id,
        statusId: dto.statusId,
        paymentMethodId: dto.paymentMethodId ?? null,
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
        date: new Date(dto.date),
        orderNumber: dto.orderNumber ?? null,
        login: dto.login ?? null,
        notes: dto.notes ?? null,
        auditNote: dto.auditNote ?? null,
        scheduleDate: dto.scheduleDate ? new Date(dto.scheduleDate) : null,
        schedulePeriodId: dto.schedulePeriodId || null,
        installedAt: dto.installedAt ? new Date(dto.installedAt) : null,
        brscan: dto.brscan ?? null,
        bankAgency: dto.bankAgency ?? null,
        bankAccount: dto.bankAccount ?? null,
        bankName: dto.bankName ?? null,
      },
      include: SALE_INCLUDE,
    });

    await this.attachSaleAddress(sale.id, customer.id, dto.customer);

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
    const plan = await this.prisma.plan.findUnique({ where: { id: nextPlanId } });
    if (!plan || !plan.active) {
      throw new AppException(ErrorCode.DOMAIN_VALUE_INVALID, "Plano inválido ou inativo");
    }
    this.assertAmountInRange(nextAmount, plan);

    if (dto.paymentMethodId) {
      const payment = await this.assertDomainValue(dto.paymentMethodId, "PAYMENT_METHOD");
      this.assertBankData(payment.value, {
        bankAgency: dto.bankAgency ?? before.bankAgency,
        bankAccount: dto.bankAccount ?? before.bankAccount,
        bankName: dto.bankName ?? before.bankName,
      });
    }
    if (dto.mailingId) await this.assertDomainValue(dto.mailingId, "MAILING");
    if (dto.schedulePeriodId) await this.assertDomainValue(dto.schedulePeriodId, "SCHEDULE_PERIOD");

    const { pdvId, systemId } = await resolveFixedSaleDomains(this.prisma);
    const { date, scheduleDate, schedulePeriodId, installedAt, ...rest } = dto;
    const sale = await this.prisma.sale.update({
      where: { id },
      data: {
        ...rest,
        pdvId,
        systemId,
        qty: saleDefaults.qty,
        date: date ? new Date(date) : undefined,
        scheduleDate: persistOptionalDate(scheduleDate),
        schedulePeriodId: schedulePeriodId === undefined ? undefined : schedulePeriodId || null,
        installedAt: persistOptionalDate(installedAt),
      },
      include: SALE_INCLUDE,
    });

    await this.audit.record({
      entity: "Sale",
      entityId: id,
      action: "UPDATE",
      ctx,
      before: { amount: String(before.amount), statusId: before.statusId, pdvId: before.pdvId },
      after: { amount: String(nextAmount), statusId: sale.statusId, pdvId: sale.pdvId },
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
    if (actor.isSuperAdmin) return true;
    return (actor.role?.permissions ?? []).includes("sales.view_all");
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
    if (query.from || query.to) {
      const range: Record<string, Date> = {};
      if (query.from) range.gte = new Date(query.from);
      if (query.to) range.lte = new Date(query.to);
      where.date = range;
    }
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
    const nameById = await this.resolveHistoryReferenceNames(entries.map((entry) => entry.diff));
    return entries.map((entry) => ({
      ...entry,
      diff: humanizeDiff(entry.diff, entry.action, nameById),
    }));
  }

  private async resolveHistoryReferenceNames(diffs: unknown[]): Promise<Map<string, string>> {
    const idsByModel = collectReferenceIds(diffs);
    const [domainValues, users, plans] = await Promise.all([
      idsByModel.domainValue.length
        ? this.prisma.domainValue.findMany({
            where: { id: { in: idsByModel.domainValue } },
            select: { id: true, value: true },
          })
        : Promise.resolve([]),
      idsByModel.user.length
        ? this.prisma.user.findMany({
            where: { id: { in: idsByModel.user } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      idsByModel.plan.length
        ? this.prisma.plan.findMany({
            where: { id: { in: idsByModel.plan } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
    ]);
    const nameById = new Map<string, string>();
    for (const domainValue of domainValues) nameById.set(domainValue.id, domainValue.value);
    for (const user of users) nameById.set(user.id, user.name);
    for (const plan of plans) nameById.set(plan.id, plan.name);
    return nameById;
  }

  async getActor(userId: string): Promise<SaleActor> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    if (!user) {
      throw new AppException(ErrorCode.UNAUTHORIZED, "Não autenticado", HttpStatus.UNAUTHORIZED);
    }
    if (user.status !== "ACTIVE") {
      throw new AppException(ErrorCode.USER_INACTIVE, "Conta inativa", HttpStatus.FORBIDDEN);
    }
    return user;
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

  private assertBankData(
    paymentValue: string,
    bank: { bankAgency?: string | null; bankAccount?: string | null; bankName?: string | null },
  ): void {
    if (paymentValue.toUpperCase().includes("DÉBITO")) {
      if (!bank.bankAgency || !bank.bankAccount || !bank.bankName) {
        throw new AppException(
          ErrorCode.SALE_BANK_DATA_REQUIRED,
          "Dados bancários são obrigatórios para débito automático",
        );
      }
    }
  }

  private resolveSeller(requestedSellerId: string | undefined, actor: SaleActor): string {
    if (!requestedSellerId || requestedSellerId === actor.id) return actor.id;
    this.permissions.check(actor, ["sales.change_seller"]);
    return requestedSellerId;
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

  private async upsertCustomer(input: CustomerInputDto) {
    const fields = {
      name: input.name,
      birthDate: input.birthDate ? new Date(input.birthDate) : null,
      motherName: input.motherName ?? null,
      email: input.email ?? null,
      phone1: input.phone1 ?? null,
      phone2: input.phone2 ?? null,
    };
    if (input.id) {
      const existing = await this.prisma.customer.findUnique({ where: { id: input.id } });
      if (!existing) {
        throw new AppException(
          ErrorCode.CUSTOMER_NOT_FOUND,
          "Cliente não encontrado",
          HttpStatus.NOT_FOUND,
        );
      }
      return this.prisma.customer.update({ where: { id: input.id }, data: fields });
    }
    return this.prisma.customer.upsert({
      where: { cpfCnpj: input.cpfCnpj },
      update: fields,
      create: { cpfCnpj: input.cpfCnpj, ...fields },
    });
  }

  private async attachSaleAddress(saleId: string, customerId: string, input: CustomerInputDto) {
    const snapshot = await this.resolveAddressSnapshot(customerId, input);
    if (!snapshot || isAddressEmpty(snapshot)) return;
    await this.prisma.saleAddress.create({ data: { saleId, ...snapshot } });
    await this.ensureCatalogAddress(customerId, snapshot);
  }

  private async resolveAddressSnapshot(
    customerId: string,
    input: CustomerInputDto,
  ): Promise<AddressSnapshot | null> {
    if (input.customerAddressId) {
      const row = await this.prisma.customerAddress.findUnique({
        where: { id: input.customerAddressId },
      });
      if (!row || row.customerId !== customerId) {
        throw new AppException(
          ErrorCode.INVALID_INPUT,
          "Endereço não encontrado",
          HttpStatus.BAD_REQUEST,
        );
      }
      return snapshotFromRow(row);
    }
    if (input.address) return addressSnapshotFromInput(input.address);
    const fallback = await this.prisma.customerAddress.findFirst({
      where: { customerId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
    return fallback ? snapshotFromRow(fallback) : null;
  }

  private async ensureCatalogAddress(customerId: string, snapshot: AddressSnapshot) {
    const existing = await this.prisma.customerAddress.findMany({ where: { customerId } });
    const key = addressDedupeKey(snapshot);
    if (existing.some((row) => addressDedupeKey(snapshotFromRow(row)) === key)) return;
    await this.prisma.customerAddress.create({
      data: { customerId, ...snapshot, isDefault: existing.length === 0 },
    });
  }
}

function snapshotFromRow(row: AddressSnapshot): AddressSnapshot {
  return {
    postalCode: row.postalCode,
    street: row.street,
    number: row.number,
    noNumber: row.noNumber,
    complement: row.complement,
    neighborhood: row.neighborhood,
    city: row.city,
    state: row.state,
  };
}
