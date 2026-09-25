import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import * as argon2 from "argon2";
import { PrismaClient } from "./generated/prisma/client/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await argon2.hash("admin123");

  const user = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: { isSuperAdmin: true },
    create: {
      name: "Admin",
      email: "admin@example.com",
      phone: null,
      isSuperAdmin: true,
      status: "ACTIVE",
      reference: "0001",
      identifier: null,
      credential: { create: { passwordHash } },
    },
  });

  const domainValues: Array<{
    type: "SALE_STATUS" | "PAYMENT_METHOD" | "PDV" | "SYSTEM" | "PLAN_TYPE" | "SCHEDULE_PERIOD";
    value: string;
    order: number;
  }> = [
    { type: "SALE_STATUS", value: "GROSS", order: 1 },
    { type: "SALE_STATUS", value: "AG. INSTALAÇÃO", order: 2 },
    { type: "SALE_STATUS", value: "AG. BIOMETRIA", order: 3 },
    { type: "SALE_STATUS", value: "CANCELADA", order: 4 },
    { type: "PAYMENT_METHOD", value: "BOLETO", order: 1 },
    { type: "PAYMENT_METHOD", value: "DÉBITO AUTOMÁTICO", order: 2 },
    { type: "PDV", value: "PDV PADRÃO", order: 1 },
    { type: "SYSTEM", value: "SISTEMA PADRÃO", order: 1 },
    { type: "PLAN_TYPE", value: "Internet", order: 1 },
    { type: "PLAN_TYPE", value: "Fixo", order: 2 },
    { type: "SCHEDULE_PERIOD", value: "08:00 - 10:00", order: 1 },
    { type: "SCHEDULE_PERIOD", value: "08:00 - 13:00", order: 2 },
    { type: "SCHEDULE_PERIOD", value: "10:00 - 12:00", order: 3 },
    { type: "SCHEDULE_PERIOD", value: "13:00 - 16:00", order: 4 },
    { type: "SCHEDULE_PERIOD", value: "14:00 - 19:00", order: 5 },
    { type: "SCHEDULE_PERIOD", value: "16:00 - 18:00", order: 6 },
  ];
  for (const dv of domainValues) {
    await prisma.domainValue.upsert({
      where: { type_value: { type: dv.type, value: dv.value } },
      update: {},
      create: dv,
    });
  }

  const settings: Array<{ key: string; value: number | number[] }> = [
    { key: "DUE_NOTIFICATION_DAYS", value: [0, 1] },
    { key: "UPLOAD_MAX_MB", value: 25 },
  ];
  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: {},
      create: { key: s.key, value: s.value },
    });
  }

  console.log(`Seeded user: ${user.email} (ref: ${user.reference})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
