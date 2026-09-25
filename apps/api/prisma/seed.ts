import "dotenv/config";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import * as argon2 from "argon2";
import { DOMAIN_TYPES, parseSeedFile } from "../src/seed/seed-file";
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

function loadSeedFile() {
  const path = process.env.SEED_FILE || resolve(__dirname, "../../../clients/example/seed.json");
  return parseSeedFile(JSON.parse(readFileSync(path, "utf8")), {
    pdv: process.env.SALE_DEFAULT_PDV || "PDV PADRÃO",
    system: process.env.SALE_DEFAULT_SYSTEM || "SISTEMA PADRÃO",
  });
}

async function main() {
  const seed = loadSeedFile();
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

  for (const type of DOMAIN_TYPES) {
    const wanted = seed.domainValues[type] ?? [];
    if (wanted.length === 0) continue;
    const existing = await prisma.domainValue.findMany({
      where: { type },
      select: { value: true, order: true },
    });
    const known = new Set(existing.map((row) => row.value));
    const missing = wanted.filter((value) => !known.has(value));
    const lastOrder = existing.reduce((max, row) => Math.max(max, row.order), 0);
    for (const [index, value] of missing.entries()) {
      await prisma.domainValue.create({ data: { type, value, order: lastOrder + index + 1 } });
    }
    console.log(
      `DOMAIN ${type}: created ${missing.length}, existing ${wanted.length - missing.length}`,
    );
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
