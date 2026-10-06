-- Date-only values were stored as UTC midnight of the Brazilian day; values that carry a
-- time (imported installation times, API callers) take their São Paulo day instead.
ALTER TABLE "sales" ALTER COLUMN "date" TYPE DATE USING (
  CASE WHEN "date"::time = '00:00' THEN "date"::date
       ELSE ("date" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date END);

ALTER TABLE "sales" ALTER COLUMN "installedAt" TYPE DATE USING (
  CASE WHEN "installedAt"::time = '00:00' THEN "installedAt"::date
       ELSE ("installedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date END);

ALTER TABLE "customers" ALTER COLUMN "birthDate" TYPE DATE USING (
  CASE WHEN "birthDate"::time = '00:00' THEN "birthDate"::date
       ELSE ("birthDate" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date END);
