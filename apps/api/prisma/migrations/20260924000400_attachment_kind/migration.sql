CREATE TYPE "AttachmentKind" AS ENUM ('AUDIO', 'PROOF_OF_ADDRESS', 'OTHER');

ALTER TABLE "attachments" ADD COLUMN "kind" "AttachmentKind" NOT NULL DEFAULT 'OTHER';
