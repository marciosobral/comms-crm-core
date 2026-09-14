import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client/client";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

type CollisionRow = {
  digits: string;
  ids: string[];
};

async function main() {
  const userCollisions = await prisma.$queryRaw<CollisionRow[]>`
    SELECT digits, array_agg(id) AS ids
    FROM (
      SELECT id, regexp_replace(cpf, '[^0-9]', '', 'g') AS digits
      FROM users
      WHERE cpf IS NOT NULL AND cpf <> ''
    ) t
    GROUP BY digits
    HAVING count(*) > 1
  `;

  if (userCollisions.length > 0) {
    console.error("CPF collisions found in users:");
    for (const row of userCollisions) {
      console.error(`  digits=${row.digits}, ids=${row.ids.join(", ")}`);
    }
    process.exit(1);
  }

  const customerCollisions = await prisma.$queryRaw<CollisionRow[]>`
    SELECT digits, array_agg(id) AS ids
    FROM (
      SELECT id, regexp_replace("cpfCnpj", '[^0-9]', '', 'g') AS digits
      FROM customers
      WHERE "cpfCnpj" IS NOT NULL AND "cpfCnpj" <> ''
    ) t
    GROUP BY digits
    HAVING count(*) > 1
  `;

  if (customerCollisions.length > 0) {
    console.error("CPF/CNPJ collisions found in customers:");
    for (const row of customerCollisions) {
      console.error(`  digits=${row.digits}, ids=${row.ids.join(", ")}`);
    }
    process.exit(1);
  }

  const userCount = await prisma.$executeRaw`
    UPDATE users
    SET cpf = NULLIF(regexp_replace(cpf, '[^0-9]', '', 'g'), ''),
        phone = NULLIF(regexp_replace(phone, '[^0-9]', '', 'g'), ''),
        email = lower(trim(email))
  `;

  const customerCount = await prisma.$executeRaw`
    UPDATE customers
    SET "cpfCnpj" = regexp_replace("cpfCnpj", '[^0-9]', '', 'g'),
        phone1 = NULLIF(regexp_replace(phone1, '[^0-9]', '', 'g'), ''),
        phone2 = NULLIF(regexp_replace(phone2, '[^0-9]', '', 'g'), ''),
        email = NULLIF(lower(trim(email)), ''),
        state = NULLIF(upper(trim(state)), '')
  `;

  if (typeof userCount === "number") {
    console.log(`Normalized ${userCount} users`);
  } else {
    console.log("User updates ran");
  }

  if (typeof customerCount === "number") {
    console.log(`Normalized ${customerCount} customers`);
  } else {
    console.log("Customer updates ran");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
