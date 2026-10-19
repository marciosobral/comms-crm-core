import type { PrismaClient } from "@prisma-client";
import type { DemoDataset } from "./dataset";

// The template starts as a copy of the base database, which may hold the seeded admin; the demo
// data replaces everything in it.
export async function clearTables(prisma: PrismaClient): Promise<void> {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length === 0) return;
  const list = tables.map((table) => `"${table.tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE ${list} CASCADE`);
}

export async function writeDemoDataset(prisma: PrismaClient, data: DemoDataset): Promise<void> {
  await prisma.role.createMany({ data: data.roles });
  await prisma.user.createMany({ data: data.users });
  await prisma.domainValue.createMany({ data: data.domainValues });
  await prisma.plan.createMany({ data: data.plans });
  await prisma.customer.createMany({ data: data.customers });
  await prisma.customerAddress.createMany({ data: data.customerAddresses });
  await prisma.sale.createMany({ data: data.sales });
  await prisma.saleAddress.createMany({ data: data.saleAddresses });
  await prisma.auditLog.createMany({ data: data.auditLogs });
  await prisma.notification.createMany({ data: data.notifications });
  await prisma.importBatch.createMany({ data: data.importBatches });
  await prisma.importRow.createMany({ data: data.importRows });
  await prisma.systemSetting.createMany({ data: data.systemSettings });
}
