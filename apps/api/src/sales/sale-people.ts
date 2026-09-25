import { HttpStatus } from "@nestjs/common";
import type { Prisma, SaleFunction } from "../../prisma/generated/prisma/client/client";
import { AppException } from "../logging/app-exception";
import { ErrorCode } from "../logging/error-codes";
import type { PrismaService } from "../prisma";

export interface AssignablePerson {
  id: string;
  name: string;
}

export type AssignablePeople = Record<SaleFunction, AssignablePerson[]>;

const FUNCTION_LABELS: Record<SaleFunction, string> = {
  SELLER: "vendedor",
  SUPERVISOR: "supervisor",
  BKO: "BKO",
  AUDITOR: "auditor",
};

// Until some active role is given a function, that list stays open to every active user.
async function eligibleUserWhere(
  prisma: PrismaService,
  saleFunction: SaleFunction,
): Promise<Prisma.UserWhereInput> {
  const configuredRoles = await prisma.role.count({
    where: { active: true, saleFunctions: { has: saleFunction } },
  });
  return {
    status: "ACTIVE",
    isSuperAdmin: false,
    ...(configuredRoles > 0
      ? { role: { active: true, saleFunctions: { has: saleFunction } } }
      : {}),
  };
}

async function listEligible(prisma: PrismaService, saleFunction: SaleFunction) {
  return prisma.user.findMany({
    where: await eligibleUserWhere(prisma, saleFunction),
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function assignablePeople(prisma: PrismaService): Promise<AssignablePeople> {
  const [SELLER, SUPERVISOR, BKO, AUDITOR] = await Promise.all([
    listEligible(prisma, "SELLER"),
    listEligible(prisma, "SUPERVISOR"),
    listEligible(prisma, "BKO"),
    listEligible(prisma, "AUDITOR"),
  ]);
  return { SELLER, SUPERVISOR, BKO, AUDITOR };
}

export async function assertEligible(
  prisma: PrismaService,
  saleFunction: SaleFunction,
  userId: string,
): Promise<void> {
  const where = await eligibleUserWhere(prisma, saleFunction);
  const matches = await prisma.user.count({ where: { ...where, id: userId } });
  if (matches === 0) {
    throw new AppException(
      ErrorCode.SALE_PERSON_NOT_ELIGIBLE,
      `Esta pessoa não pode ser ${FUNCTION_LABELS[saleFunction]} da venda`,
      HttpStatus.BAD_REQUEST,
    );
  }
}
