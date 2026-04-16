-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'QUARTIERMEISTER', 'MITGLIED', 'GAST', 'EL_PATRON', 'DON', 'ASESOR', 'ROUTENVERWALTUNG', 'SOLDADO');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('IN', 'OUT', 'ADJUST', 'RESERVE', 'RELEASE');

-- CreateEnum
CREATE TYPE "MoneyKind" AS ENUM ('EINZAHLUNG', 'AUSZAHLUNG', 'TRANSFER', 'KORREKTUR');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DepositStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "discordId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "email" TEXT,
    "role" "Role" NOT NULL DEFAULT 'SOLDADO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modules" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "categoryId" TEXT NOT NULL,
    "minStock" INTEGER NOT NULL DEFAULT 0,
    "currentStock" INTEGER NOT NULL DEFAULT 0,
    "reservedStock" INTEGER NOT NULL DEFAULT 0,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[],
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "type" "MovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "previousStock" INTEGER NOT NULL,
    "newStock" INTEGER NOT NULL,
    "note" TEXT,
    "reference" TEXT,
    "batchNumber" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "money_transactions" (
    "id" TEXT NOT NULL,
    "kind" "MoneyKind" NOT NULL,
    "amount" INTEGER NOT NULL,
    "category" TEXT,
    "note" TEXT,
    "reference" TEXT,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "createdById" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "money_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "meta" JSONB NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "action_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kokain_deposits" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packages" INTEGER NOT NULL,
    "status" "DepositStatus" NOT NULL DEFAULT 'PENDING',
    "confirmedById" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "note" TEXT,
    "uebergabeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kokain_deposits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kokain_uebergaben" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "totalPackages" INTEGER NOT NULL,
    "totalValue" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kokain_uebergaben_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_discordId_key" ON "users"("discordId");

-- CreateIndex
CREATE UNIQUE INDEX "modules_key_key" ON "modules"("key");

-- CreateIndex
CREATE UNIQUE INDEX "item_categories_name_key" ON "item_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "items_sku_key" ON "items"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "item_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "money_transactions" ADD CONSTRAINT "money_transactions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "money_transactions" ADD CONSTRAINT "money_transactions_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_logs" ADD CONSTRAINT "action_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kokain_deposits" ADD CONSTRAINT "kokain_deposits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kokain_deposits" ADD CONSTRAINT "kokain_deposits_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kokain_deposits" ADD CONSTRAINT "kokain_deposits_uebergabeId_fkey" FOREIGN KEY ("uebergabeId") REFERENCES "kokain_uebergaben"("id") ON DELETE SET NULL ON UPDATE CASCADE;
