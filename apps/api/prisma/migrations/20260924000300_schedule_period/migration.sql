INSERT INTO "domain_values" ("id", "type", "value", "order", "active", "updatedAt") VALUES
  (gen_random_uuid()::text, 'SCHEDULE_PERIOD', '08:00 - 10:00', 1, true, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'SCHEDULE_PERIOD', '08:00 - 13:00', 2, true, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'SCHEDULE_PERIOD', '10:00 - 12:00', 3, true, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'SCHEDULE_PERIOD', '13:00 - 16:00', 4, true, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'SCHEDULE_PERIOD', '14:00 - 19:00', 5, true, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'SCHEDULE_PERIOD', '16:00 - 18:00', 6, true, CURRENT_TIMESTAMP)
ON CONFLICT ("type", "value") DO NOTHING;

ALTER TABLE "sales" ADD COLUMN "scheduleDate" DATE;
ALTER TABLE "sales" ADD COLUMN "schedulePeriodId" TEXT;

UPDATE "sales"
   SET "scheduleDate" = ("scheduleStart" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date
 WHERE "scheduleStart" IS NOT NULL;

WITH labels AS (
  SELECT DISTINCT
    to_char("scheduleStart" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI')
    || ' - ' ||
    to_char("scheduleEnd" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI') AS label
  FROM "sales"
  WHERE "scheduleStart" IS NOT NULL AND "scheduleEnd" IS NOT NULL
), missing AS (
  SELECT label, row_number() OVER (ORDER BY label) AS n
  FROM labels
  WHERE label NOT IN (SELECT "value" FROM "domain_values" WHERE "type" = 'SCHEDULE_PERIOD')
)
INSERT INTO "domain_values" ("id", "type", "value", "order", "active", "updatedAt")
SELECT gen_random_uuid()::text, 'SCHEDULE_PERIOD', label,
       (SELECT COALESCE(MAX("order"), 0) FROM "domain_values" WHERE "type" = 'SCHEDULE_PERIOD') + n,
       true, CURRENT_TIMESTAMP
FROM missing;

UPDATE "sales" s
   SET "schedulePeriodId" = dv."id"
  FROM "domain_values" dv
 WHERE dv."type" = 'SCHEDULE_PERIOD'
   AND s."scheduleStart" IS NOT NULL
   AND s."scheduleEnd" IS NOT NULL
   AND dv."value" =
       to_char(s."scheduleStart" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI')
       || ' - ' ||
       to_char(s."scheduleEnd" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI');

ALTER TABLE "sales" DROP COLUMN "scheduleStart";
ALTER TABLE "sales" DROP COLUMN "scheduleEnd";
ALTER TABLE "sales" ADD CONSTRAINT "sales_schedulePeriodId_fkey" FOREIGN KEY ("schedulePeriodId") REFERENCES "domain_values"("id") ON DELETE SET NULL ON UPDATE CASCADE;
