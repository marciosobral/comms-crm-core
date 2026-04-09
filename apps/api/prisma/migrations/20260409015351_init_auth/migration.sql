-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'SUPERVISOR', 'SALESMAN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'PENDING', 'BLOCKED', 'INACTIVE', 'DELETED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "reference" VARCHAR(4) NOT NULL,
    "identifier" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credentials" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "refreshToken" TEXT,
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "method" VARCHAR(10) NOT NULL,
    "path" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "responseTime" INTEGER NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_reference_key" ON "users"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "credentials_userId_key" ON "credentials"("userId");

-- AddForeignKey
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_logs" ADD CONSTRAINT "api_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
