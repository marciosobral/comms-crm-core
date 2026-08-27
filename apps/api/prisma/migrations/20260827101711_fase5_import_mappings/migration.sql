-- CreateEnum
CREATE TYPE "ImportMappingKind" AS ENUM ('USER', 'DOMAIN', 'PLAN');

-- AlterTable
ALTER TABLE "import_rows" ADD COLUMN     "dedupeKey" TEXT;

-- CreateTable
CREATE TABLE "import_mappings" (
    "id" TEXT NOT NULL,
    "kind" "ImportMappingKind" NOT NULL,
    "domainType" "DomainType",
    "sourceValue" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "import_mappings_kind_domainType_sourceValue_key" ON "import_mappings"("kind", "domainType", "sourceValue");

-- CreateIndex
CREATE INDEX "import_rows_dedupeKey_idx" ON "import_rows"("dedupeKey");
