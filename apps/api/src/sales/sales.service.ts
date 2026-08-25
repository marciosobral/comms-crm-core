import { HttpStatus, Injectable } from "@nestjs/common";
import type { AuditContext } from "../audit/audit-context.decorator";
import { AuditService } from "../audit/audit.service";
import { AppException } from "../logging/app-exception";
import { ErrorCode } from "../logging/error-codes";
import type { PermissionSubject } from "../permissions/permissions.service";
import { PermissionsService } from "../permissions/permissions.service";
import { PrismaService } from "../prisma";
import { CreateSaleDto, CustomerInputDto, ListSalesQuery, UpdateSaleDto } from "./dto";
import { SALE_INCLUDE } from "./sale-includes";

export type SaleActor = PermissionSubject & { id: string };

@Injectable()
export class SalesService {
  private readonly LOCKED_FIELDS = ["pdvId", "login"] as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly permissions: PermissionsService,
  ) {}

  async create(dto: CreateSaleDto, actor: SaleActor, ctx: AuditContext) {
    if (!dto.internetPlanId && !dto.fixedPlanId) {
      throw new AppException(ErrorCode.SALE_PLAN_REQUIRED, "Selecione ao menos um plano");
    }

    const pricingPlanId = dto.internetPlanId ?? dto.fixedPlanId;
    const pricingPlan = pricingPlanId
      ? await this.prisma.plan.findUnique({ where: { id: pricingPlanId } })
      : null;
    if (!pricingPlan || !pricingPlan.active) {
      throw new AppException(ErrorCode.DOMAIN_VALUE_INVALID, "Plano inválido ou inativo");
    }
    this.assertAmountInRange(dto.amount, pricingPlan);

    await this.assertDomainValue(dto.statusId, "SALE_STATUS");
    if (dto.paymentMethodId) {
      const payment = await this.assertDomainValue(dto.paymentMethodId, "PAYMENT_METHOD");
      this.assertBankData(payment.value, dto);
    }
    if (dto.systemId) await this.assertDomainValue(dto.systemId, "SYSTEM");
    if (dto.mailingId) await this.assertDomainValue(dto.mailingId, "MAILING");
    if (dto.pdvId) await this.assertDomainValue(dto.pdvId, "PDV");

    const sellerId = this.resolveSeller(dto.sellerId, actor);
    const pdvId = dto.pdvId ?? (await this.defaultPdvId());
    const customer = await this.upsertCustomer(dto.customer);

    const sale = await this.prisma.sale.create({
      data: {
        customerId: customer.id,
        statusId: dto.statusId,
        paymentMethodId: dto.paymentMethodId ?? null,
        systemId: dto.systemId ?? null,
        mailingId: dto.mailingId ?? null,
        pdvId,
        sellerId,
        supervisorId: dto.supervisorId ?? null,
        bkoId: dto.bkoId ?? null,
        auditorId: dto.auditorId ?? null,
        fixedPlanId: dto.fixedPlanId ?? null,
        internetPlanId: dto.internetPlanId ?? null,
        amount: dto.amount,
        qty: dto.qty ?? 1,
        dueDay: dto.dueDay ?? null,
        date: new Date(dto.date),
        orderNumber: dto.orderNumber ?? null,
        login: dto.login ?? null,
        notes: dto.notes ?? null,
        auditNote: dto.auditNote ?? null,
        scheduleStart: dto.scheduleStart ? new Date(dto.scheduleStart) : null,
        scheduleEnd: dto.scheduleEnd ? new Date(dto.scheduleEnd) : null,
        installedAt: dto.installedAt ? new Date(dto.installedAt) : null,
        brscan: dto.brscan ?? null,
        bankAgency: dto.bankAgency ?? null,
        bankAccount: dto.bankAccount ?? null,
        bankName: dto.bankName ?? null,
      },
      include: SALE_INCLUDE,
    });

    await this.audit.record({
      entity: "Sale",
      entityId: sale.id,
      action: "CREATE",
      ctx,
      after: { id: sale.id, amount: String(dto.amount), statusId: dto.statusId, sellerId },
    });
    return sale;
  }

  async update(id: string, dto: UpdateSaleDto, actor: SaleActor, ctx: AuditContext) {
    const before = await this.detail(id, actor);
    this.permissions.check(actor, ["sales.edit"]);

    const touchesLocked = this.LOCKED_FIELDS.some(
      (field) => dto[field] !== undefined && dto[field] !== before[field],
    );
    if (touchesLocked) this.permissions.check(actor, ["sales.edit_locked_fields"]);

    const nextInternet = dto.internetPlanId ?? before.internetPlanId;
    const nextFixed = dto.fixedPlanId ?? before.fixedPlanId;
    if (!nextInternet && !nextFixed) {
      throw new AppException(ErrorCode.SALE_PLAN_REQUIRED, "Selecione ao menos um plano");
    }
    const nextAmount = dto.amount ?? Number(before.amount);
    const pricingPlanId = nextInternet ?? nextFixed;
    if (pricingPlanId) {
      const plan = await this.prisma.plan.findUnique({ where: { id: pricingPlanId } });
      if (!plan || !plan.active) {
        throw new AppException(ErrorCode.DOMAIN_VALUE_INVALID, "Plano inválido ou inativo");
      }
      this.assertAmountInRange(nextAmount, plan);
    }

    if (dto.paymentMethodId) {
      const payment = await this.assertDomainValue(dto.paymentMethodId, "PAYMENT_METHOD");
      this.assertBankData(payment.value, {
        bankAgency: dto.bankAgency ?? before.bankAgency,
        bankAccount: dto.bankAccount ?? before.bankAccount,
        bankName: dto.bankName ?? before.bankName,
      });
    }
    if (dto.pdvId) await this.assertDomainValue(dto.pdvId, "PDV");
    if (dto.systemId) await this.assertDomainValue(dto.systemId, "SYSTEM");
    if (dto.mailingId) await this.assertDomainValue(dto.mailingId, "MAILING");

    const { date, scheduleStart, scheduleEnd, installedAt, ...rest } = dto;
    const sale = await this.prisma.sale.update({
      where: { id },
      data: {
        ...rest,
        date: date ? new Date(date) : undefined,
        scheduleStart: scheduleStart ? new Date(scheduleStart) : undefined,
        scheduleEnd: scheduleEnd ? new Date(scheduleEnd) : undefined,
        installedAt: installedAt ? new Date(installedAt) : undefined,
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
    return sale;
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
    return sale;
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
    return sale;
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
    return sale;
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
    if (query.planId) {
      where.OR = [{ internetPlanId: query.planId }, { fixedPlanId: query.planId }];
    }
    if (query.city) {
      where.customer = { city: { contains: query.city, mode: "insensitive" } };
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
    return { items, total, page, perPage };
  }

  async detail(id: string, actor: SaleActor) {
    const sale = await this.prisma.sale.findUnique({ where: { id }, include: SALE_INCLUDE });
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
    return sale;
  }

  async history(id: string, actor: SaleActor) {
    await this.detail(id, actor);
    return this.prisma.auditLog.findMany({
      where: { entity: "Sale", entityId: id },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true } } },
    });
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

  private async defaultPdvId(): Promise<string | null> {
    const pdv = await this.prisma.domainValue.findFirst({
      where: { type: "PDV", active: true },
      orderBy: { order: "asc" },
    });
    return pdv?.id ?? null;
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

  private upsertCustomer(input: CustomerInputDto) {
    const fields = {
      name: input.name,
      birthDate: input.birthDate ? new Date(input.birthDate) : null,
      motherName: input.motherName ?? null,
      address: input.address ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      email: input.email ?? null,
      phone1: input.phone1 ?? null,
      phone2: input.phone2 ?? null,
    };
    return this.prisma.customer.upsert({
      where: { cpfCnpj: input.cpfCnpj },
      update: fields,
      create: { cpfCnpj: input.cpfCnpj, ...fields },
    });
  }
}
