ALTER TABLE "users" ADD COLUMN "externalReference" TEXT;

-- The sale-level login becomes the seller's registration: keep each seller's most used value.
UPDATE "users" AS u
SET "externalReference" = most_used.login
FROM (
  SELECT DISTINCT ON ("sellerId") "sellerId", btrim(login) AS login
  FROM "sales"
  WHERE login IS NOT NULL AND btrim(login) <> ''
  GROUP BY "sellerId", btrim(login)
  ORDER BY "sellerId", count(*) DESC, btrim(login)
) AS most_used
WHERE u.id = most_used."sellerId";

ALTER TABLE "sales" DROP COLUMN "login";
