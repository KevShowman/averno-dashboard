-- Partner System Migration

-- Add isPartner field to users
ALTER TABLE `users` ADD COLUMN `isPartner` BOOLEAN NOT NULL DEFAULT false;

-- Add PARTNER to Role enum (MySQL doesn't support ALTER ENUM, so we recreate)
-- Note: This might need manual adjustment based on existing data

-- Create PartnerAccessRequest table
CREATE TABLE `partner_access_requests` (
    `id` VARCHAR(191) NOT NULL,
    `discordId` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `avatarUrl` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `reviewedById` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewNote` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `partner_access_requests_discordId_key`(`discordId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create PartnerManagementPermission table
CREATE TABLE `partner_management_permissions` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `grantedById` VARCHAR(191) NULL,
    `grantedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `partner_management_permissions_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create PartnerFamilySuggestion table
CREATE TABLE `partner_family_suggestions` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('CREATE', 'UPDATE') NOT NULL,
    `familyContactId` VARCHAR(191) NULL,
    `familyName` VARCHAR(191) NOT NULL,
    `familyStatus` ENUM('UNKNOWN', 'ACTIVE', 'ENDANGERED', 'DISSOLVED') NULL,
    `propertyZip` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `mapName` ENUM('NARCO_CITY', 'ROXWOOD', 'CAYO_PERICO') NULL,
    `mapX` DOUBLE NULL,
    `mapY` DOUBLE NULL,
    `mapIcon` VARCHAR(191) NULL,
    `suggestionStatus` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `createdById` VARCHAR(191) NOT NULL,
    `reviewedById` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewNote` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add Foreign Key Constraints
ALTER TABLE `partner_access_requests` ADD CONSTRAINT `partner_access_requests_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `partner_management_permissions` ADD CONSTRAINT `partner_management_permissions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `partner_management_permissions` ADD CONSTRAINT `partner_management_permissions_grantedById_fkey` FOREIGN KEY (`grantedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `partner_family_suggestions` ADD CONSTRAINT `partner_family_suggestions_familyContactId_fkey` FOREIGN KEY (`familyContactId`) REFERENCES `family_contacts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `partner_family_suggestions` ADD CONSTRAINT `partner_family_suggestions_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `partner_family_suggestions` ADD CONSTRAINT `partner_family_suggestions_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

