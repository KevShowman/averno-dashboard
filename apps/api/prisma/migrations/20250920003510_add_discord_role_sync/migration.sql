-- AlterTable
ALTER TABLE "users" ADD COLUMN     "discordRoles" TEXT[],
ADD COLUMN     "icFirstName" TEXT,
ADD COLUMN     "icLastName" TEXT;

-- CreateTable
CREATE TABLE "discord_role_mappings" (
    "id" TEXT NOT NULL,
    "discordRoleId" TEXT NOT NULL,
    "systemRole" "Role" NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discord_role_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "discord_role_mappings_discordRoleId_key" ON "discord_role_mappings"("discordRoleId");
