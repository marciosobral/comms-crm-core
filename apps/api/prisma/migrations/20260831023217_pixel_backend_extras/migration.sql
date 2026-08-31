-- AlterTable
ALTER TABLE "domain_values" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "roles" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "lastLoginAt" TIMESTAMP(3);
