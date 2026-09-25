CREATE TYPE "BankAccountType" AS ENUM ('CHECKING', 'SAVINGS');

ALTER TABLE "sales"
  ADD COLUMN "bankCode" TEXT,
  ADD COLUMN "bankAgencyDigit" TEXT,
  ADD COLUMN "bankAccountDigit" TEXT,
  ADD COLUMN "bankAccountType" "BankAccountType",
  ADD COLUMN "accountHolderIsCustomer" BOOLEAN,
  ADD COLUMN "accountHolderName" TEXT,
  ADD COLUMN "accountHolderCpf" TEXT;
