ALTER TABLE "import_rows" ADD COLUMN "lineNumber" INTEGER;

UPDATE "import_rows" r SET "lineNumber" = n.rn + 1 FROM (SELECT id, row_number() OVER (PARTITION BY "batchId" ORDER BY "createdAt", id) AS rn FROM "import_rows") n WHERE r.id = n.id;
