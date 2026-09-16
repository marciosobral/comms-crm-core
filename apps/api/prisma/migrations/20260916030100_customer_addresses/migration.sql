-- CreateTable
CREATE TABLE "customer_addresses" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "postalCode" VARCHAR(8),
    "street" TEXT,
    "number" TEXT,
    "noNumber" BOOLEAN NOT NULL DEFAULT false,
    "complement" TEXT,
    "neighborhood" TEXT,
    "city" TEXT,
    "state" VARCHAR(2),
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_addresses" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "postalCode" VARCHAR(8),
    "street" TEXT,
    "number" TEXT,
    "noNumber" BOOLEAN NOT NULL DEFAULT false,
    "complement" TEXT,
    "neighborhood" TEXT,
    "city" TEXT,
    "state" VARCHAR(2),

    CONSTRAINT "sale_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_addresses_customerId_idx" ON "customer_addresses"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "sale_addresses_saleId_key" ON "sale_addresses"("saleId");

-- AddForeignKey
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_addresses" ADD CONSTRAINT "sale_addresses_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate legacy customer address fields
INSERT INTO "customer_addresses" ("id", "customerId", "street", "city", "state", "isDefault", "createdAt", "updatedAt")
SELECT gen_random_uuid(), "id", "address", "city", "state", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "customers"
WHERE "address" IS NOT NULL OR "city" IS NOT NULL OR "state" IS NOT NULL;

-- Snapshot default customer address onto existing sales
INSERT INTO "sale_addresses" ("id", "saleId", "street", "city", "state", "noNumber")
SELECT gen_random_uuid(), s."id", a."street", a."city", a."state", false
FROM "sales" s
INNER JOIN "customer_addresses" a ON a."customerId" = s."customerId" AND a."isDefault" = true;

-- DropTable columns
ALTER TABLE "customers" DROP COLUMN "address",
DROP COLUMN "city",
DROP COLUMN "state";
