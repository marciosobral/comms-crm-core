import { HttpStatus } from "@nestjs/common";
import type { Customer, Prisma } from "../../prisma/generated/prisma/client/client";
import {
  type AddressInputDto,
  type AddressSnapshot,
  addressDedupeKey,
  addressSnapshotFromInput,
  isAddressEmpty,
} from "../customers/dto/address-input.dto";
import { AppException } from "../logging/app-exception";
import { ErrorCode } from "../logging/error-codes";
import { type PermissionSubject, hasPermission } from "../permissions/permissions.service";
import type { CustomerInputDto } from "./dto";
import { visibleSaleWhere } from "./sale-visibility";

function missingAddress(message: string): AppException {
  return new AppException(ErrorCode.SALE_ADDRESS_REQUIRED, message);
}

export function assertNewAddressComplete(address: AddressInputDto | undefined): void {
  if (!address?.postalCode) throw missingAddress("Informe o CEP");
  if (!address.street?.trim()) throw missingAddress("Informe o endereço");
  if (!address.noNumber && !address.number?.trim()) {
    throw missingAddress("Informe o número ou marque S/N");
  }
  if (!address.neighborhood?.trim()) throw missingAddress("Informe o bairro");
  if (!address.city?.trim()) throw missingAddress("Informe a cidade");
  if (!address.state) throw missingAddress("Selecione a UF");
}

const CUSTOMER_WITH_ADDRESSES = {
  addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] },
} satisfies Prisma.CustomerInclude;

type CustomerWithAddresses = Prisma.CustomerGetPayload<{
  include: typeof CUSTOMER_WITH_ADDRESSES;
}>;

function presentOrUndefined(value: string | undefined): string | undefined {
  return value?.trim() ? value : undefined;
}

export async function upsertCustomer(
  tx: Prisma.TransactionClient,
  input: CustomerInputDto,
  actor: PermissionSubject & { id: string },
): Promise<{
  customer: Customer;
  before: CustomerWithAddresses | null;
  after: CustomerWithAddresses | null;
}> {
  const existing = input.id
    ? await tx.customer.findUnique({ where: { id: input.id }, include: CUSTOMER_WITH_ADDRESSES })
    : await tx.customer.findUnique({
        where: { cpfCnpj: input.cpfCnpj },
        include: CUSTOMER_WITH_ADDRESSES,
      });
  if (!existing) {
    if (input.id) {
      throw new AppException(
        ErrorCode.CUSTOMER_NOT_FOUND,
        "Cliente não encontrado",
        HttpStatus.NOT_FOUND,
      );
    }
    const customer = await tx.customer.create({
      data: {
        cpfCnpj: input.cpfCnpj,
        name: input.name,
        birthDate: input.birthDate ? new Date(input.birthDate) : null,
        motherName: input.motherName ?? null,
        email: input.email ?? null,
        phone1: input.phone1 ?? null,
        phone2: input.phone2 ?? null,
      },
    });
    return { customer, before: null, after: null };
  }

  const canUpdate =
    hasPermission(actor, "customers.edit") ||
    (await tx.sale.count({ where: { customerId: existing.id, ...visibleSaleWhere(actor) } })) > 0;
  if (!canUpdate) return { customer: existing, before: null, after: null };

  const updated = await tx.customer.update({
    where: { id: existing.id },
    data: {
      name: presentOrUndefined(input.name),
      birthDate: input.birthDate ? new Date(input.birthDate) : undefined,
      motherName: presentOrUndefined(input.motherName),
      email: presentOrUndefined(input.email),
      phone1: presentOrUndefined(input.phone1),
      phone2: presentOrUndefined(input.phone2),
    },
    include: CUSTOMER_WITH_ADDRESSES,
  });
  return { customer: updated, before: existing, after: updated };
}

export async function attachSaleAddress(
  tx: Prisma.TransactionClient,
  saleId: string,
  customerId: string,
  input: CustomerInputDto,
): Promise<void> {
  const snapshot = await resolveAddressSnapshot(tx, customerId, input);
  if (!snapshot || isAddressEmpty(snapshot)) return;
  await tx.saleAddress.create({ data: { saleId, ...snapshot } });
  await ensureCatalogAddress(tx, customerId, snapshot);
}

async function resolveAddressSnapshot(
  tx: Prisma.TransactionClient,
  customerId: string,
  input: CustomerInputDto,
): Promise<AddressSnapshot | null> {
  if (input.customerAddressId) {
    const row = await tx.customerAddress.findUnique({
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
  return input.address ? addressSnapshotFromInput(input.address) : null;
}

export async function ensureCatalogAddress(
  tx: Prisma.TransactionClient,
  customerId: string,
  snapshot: AddressSnapshot,
): Promise<void> {
  const existing = await tx.customerAddress.findMany({ where: { customerId } });
  const key = addressDedupeKey(snapshot);
  if (existing.some((row) => addressDedupeKey(snapshotFromRow(row)) === key)) return;
  await tx.customerAddress.create({
    data: { customerId, ...snapshot, isDefault: existing.length === 0 },
  });
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
