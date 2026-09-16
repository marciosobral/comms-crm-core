import { Type } from "class-transformer";
import { IsBoolean, IsOptional, IsString, ValidateNested } from "class-validator";
import { IsCep, IsUf } from "../../validation/decorators";
import { ToDigits, ToUf } from "../../validation/transforms";

export class AddressInputDto {
  @IsOptional()
  @ToDigits()
  @IsCep()
  postalCode?: string;

  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  number?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  noNumber?: boolean;

  @IsOptional()
  @IsString()
  complement?: string;

  @IsOptional()
  @IsString()
  neighborhood?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @ToUf()
  @IsUf()
  state?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isDefault?: boolean;
}

export function addressSnapshotFromInput(dto: AddressInputDto) {
  const noNumber = Boolean(dto.noNumber);
  return {
    postalCode: dto.postalCode ?? null,
    street: dto.street?.trim() || null,
    number: noNumber ? null : dto.number?.trim() || null,
    noNumber,
    complement: dto.complement?.trim() || null,
    neighborhood: dto.neighborhood?.trim() || null,
    city: dto.city?.trim() || null,
    state: dto.state ?? null,
  };
}

export type AddressSnapshot = ReturnType<typeof addressSnapshotFromInput>;

export function isAddressEmpty(address: AddressSnapshot): boolean {
  return !(
    address.postalCode ||
    address.street ||
    address.number ||
    address.complement ||
    address.neighborhood ||
    address.city ||
    address.state
  );
}

export function addressDedupeKey(address: AddressSnapshot): string {
  return [address.postalCode ?? "", address.street ?? "", address.number ?? "", address.city ?? ""]
    .join("|")
    .toLowerCase();
}

export function withSingleDefault(addresses: AddressInputDto[]) {
  const snapshots = addresses.map((item) => ({
    ...addressSnapshotFromInput(item),
    isDefault: Boolean(item.isDefault),
  }));
  if (snapshots.length === 0) return snapshots;
  if (!snapshots.some((item) => item.isDefault)) snapshots[0].isDefault = true;
  let seenDefault = false;
  return snapshots.map((item) => {
    if (!item.isDefault) return item;
    if (seenDefault) return { ...item, isDefault: false };
    seenDefault = true;
    return item;
  });
}
