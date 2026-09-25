CREATE TYPE "SaleFunction" AS ENUM ('SELLER', 'SUPERVISOR', 'BKO', 'AUDITOR');

ALTER TABLE "roles" ADD COLUMN "saleFunctions" "SaleFunction"[] NOT NULL DEFAULT ARRAY[]::"SaleFunction"[];
