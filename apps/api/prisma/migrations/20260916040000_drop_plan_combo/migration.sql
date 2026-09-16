UPDATE "plans" SET "type" = 'INTERNET' WHERE "type" = 'COMBO';

ALTER TYPE "PlanType" RENAME TO "PlanType_old";
CREATE TYPE "PlanType" AS ENUM ('FIXED', 'INTERNET');
ALTER TABLE "plans" ALTER COLUMN "type" TYPE "PlanType" USING ("type"::text::"PlanType");
DROP TYPE "PlanType_old";
