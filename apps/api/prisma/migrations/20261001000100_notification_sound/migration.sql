CREATE TABLE "notification_sound" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "fileName" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_sound_pkey" PRIMARY KEY ("id")
);
