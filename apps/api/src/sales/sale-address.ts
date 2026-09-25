import { HttpStatus } from "@nestjs/common";
import type { Prisma } from "../../prisma/generated/prisma/client/client";
import {
  type AddressInputDto,
  type AddressSnapshot,
  addressDedupeKey,
  addressSnapshotFromInput,
  isAddressEmpty,
} from "../customers/dto/address-input.dto";
import { AppException } from "../logging/app-exception";
import { ErrorCode } from "../logging/error-codes";
import type { CustomerInputDto } from "./dto";

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

export async function upsertCustomer(tx: Prisma.TransactionClient, input: CustomerInputDto) {
  const fields = {
    name: input.name,
    birthDate: input.birthDate ? new Date(input.birthDate) : null,
    motherName: input.motherName ?? null,
    email: input.email ?? null,
    phone1: input.phone1 ?? null,
    phone2: input.phone2 ?? null,
  };
  if (input.id) {
    const existing = await tx.customer.findUnique({ where: { id: input.id } });
    if (!existing) {
      throw new AppException(
        ErrorCode.CUSTOMER_NOT_FOUND,
        "Cliente não encontrado",
        HttpStatus.NOT_FOUND,
      );
    }
    return tx.customer.update({ where: { id: input.id }, data: fields });
  }
  return tx.customer.upsert({
    where: { cpfCnpj: input.cpfCnpj },
    update: fields,
    create: { cpfCnpj: input.cpfCnpj, ...fields },
  });
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
