INSERT INTO "domain_values" ("id", "type", "value", "order", "active", "updatedAt") VALUES
  (gen_random_uuid()::text, 'PLAN_TYPE', 'Internet', 1, true, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'PLAN_TYPE', 'Fixo', 2, true, CURRENT_TIMESTAMP)
ON CONFLICT ("type", "value") DO NOTHING;

ALTER TABLE "plans" ADD COLUMN "typeId" TEXT;
UPDATE "plans" p SET "typeId" = dv."id" FROM "domain_values" dv
 WHERE dv."type" = 'PLAN_TYPE'
   AND dv."value" = CASE p."type" WHEN 'INTERNET' THEN 'Internet' ELSE 'Fixo' END;
ALTER TABLE "plans" ALTER COLUMN "typeId" SET NOT NULL;
ALTER TABLE "plans" DROP COLUMN "type";
DROP TYPE "PlanType";
ALTER TABLE "plans" ADD CONSTRAINT "plans_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "domain_values"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sales" ADD COLUMN "planId" TEXT;
UPDATE "sales" SET "planId" = COALESCE("internetPlanId", "fixedPlanId");
ALTER TABLE "sales" DROP CONSTRAINT "sales_fixedPlanId_fkey";
ALTER TABLE "sales" DROP CONSTRAINT "sales_internetPlanId_fkey";
ALTER TABLE "sales" DROP COLUMN "fixedPlanId";
ALTER TABLE "sales" DROP COLUMN "internetPlanId";
ALTER TABLE "sales" ADD CONSTRAINT "sales_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
