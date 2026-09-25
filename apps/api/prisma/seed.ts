import "dotenv/config";
import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import * as argon2 from "argon2";
import { SYSTEM_REFERENCE } from "../src/users/reference";
import { PrismaClient } from "./generated/prisma/client/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Required in production: the app cannot change this account's password, so .env is its only record.
function newAdminPassword(): { password: string; generated: boolean } {
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (password) {
    if (password.length < 12) throw new Error("SEED_ADMIN_PASSWORD must have 12+ characters");
    return { password, generated: false };
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("SEED_ADMIN_PASSWORD (12+ characters) is required in production");
  }
  return { password: randomBytes(18).toString("base64url"), generated: true };
}

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL || "admin@example.com";
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!existing) {
    const systemAdmin = await prisma.user.findUnique({
      where: { reference: SYSTEM_REFERENCE },
      select: { email: true },
    });
    if (systemAdmin) {
      throw new Error(
        `Reference ${SYSTEM_REFERENCE} already belongs to ${systemAdmin.email}; set SEED_ADMIN_EMAIL to that email`,
      );
    }
  }
  const admin = existing ? null : newAdminPassword();
  const passwordHash = admin ? await argon2.hash(admin.password) : "";

  const user = await prisma.user.upsert({
    where: { email },
    update: { isSuperAdmin: true },
    create: {
      name: "Admin",
      email,
      phone: null,
      isSuperAdmin: true,
      status: "ACTIVE",
      reference: SYSTEM_REFERENCE,
      identifier: null,
      credential: { create: { passwordHash } },
    },
  });

  const domainValues: Array<{
    type:
      | "SALE_STATUS"
      | "PAYMENT_METHOD"
      | "PDV"
      | "SYSTEM"
      | "PLAN_TYPE"
      | "SCHEDULE_PERIOD"
      | "MAILING";
    value: string;
    order: number;
  }> = [
    { type: "SALE_STATUS", value: "GROSS", order: 1 },
    { type: "SALE_STATUS", value: "AG. INSTALAÇÃO", order: 2 },
    { type: "SALE_STATUS", value: "AG. BIOMETRIA", order: 3 },
    { type: "SALE_STATUS", value: "CANCELADA", order: 4 },
    { type: "PAYMENT_METHOD", value: "BOLETO", order: 1 },
    { type: "PAYMENT_METHOD", value: "DÉBITO AUTOMÁTICO", order: 2 },
    { type: "PDV", value: process.env.SALE_DEFAULT_PDV || "PDV PADRÃO", order: 1 },
    { type: "SYSTEM", value: process.env.SALE_DEFAULT_SYSTEM || "SISTEMA PADRÃO", order: 1 },
    { type: "MAILING", value: "DISCADORA", order: 1 },
    { type: "MAILING", value: "DISPARO", order: 2 },
    { type: "MAILING", value: "PAP", order: 3 },
    { type: "MAILING", value: "INDICAÇÃO", order: 4 },
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
  if (!admin) {
    console.log("Admin already existed; password unchanged.");
  } else if (admin.generated) {
    console.log(`Generated admin password (shown once, save it now): ${admin.password}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
