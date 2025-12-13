-- AlterTable: Add isKeyFamily and isOutdated fields to FamilyContact
ALTER TABLE `family_contacts` ADD COLUMN `isKeyFamily` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `family_contacts` ADD COLUMN `isOutdated` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `family_contacts` ADD COLUMN `outdatedMarkedAt` DATETIME(3) NULL;
ALTER TABLE `family_contacts` ADD COLUMN `outdatedMarkedById` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `family_contacts` ADD CONSTRAINT `family_contacts_outdatedMarkedById_fkey` FOREIGN KEY (`outdatedMarkedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: DailyAttendance
CREATE TABLE `daily_attendance` (
    `id` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `markedById` VARCHAR(191) NOT NULL,
    `markedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `daily_attendance_date_userId_key`(`date`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `daily_attendance` ADD CONSTRAINT `daily_attendance_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `daily_attendance` ADD CONSTRAINT `daily_attendance_markedById_fkey` FOREIGN KEY (`markedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: AttendancePermission
CREATE TABLE `attendance_permissions` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `grantedById` VARCHAR(191) NOT NULL,
    `grantedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `attendance_permissions_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `attendance_permissions` ADD CONSTRAINT `attendance_permissions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `attendance_permissions` ADD CONSTRAINT `attendance_permissions_grantedById_fkey` FOREIGN KEY (`grantedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: MaleOutfit
CREATE TABLE `male_outfits` (
    `id` VARCHAR(191) NOT NULL,
    `outfitNumber` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `imagePath` VARCHAR(191) NULL,
    `maskItem` INTEGER NULL,
    `maskVariation` INTEGER NULL,
    `torsoItem` INTEGER NULL,
    `torsoVariation` INTEGER NULL,
    `tshirtItem` INTEGER NULL,
    `tshirtVariation` INTEGER NULL,
    `vesteItem` INTEGER NULL,
    `vesteVariation` INTEGER NULL,
    `hoseItem` INTEGER NULL,
    `hoseVariation` INTEGER NULL,
    `schuheItem` INTEGER NULL,
    `schuheVariation` INTEGER NULL,
    `rucksackItem` INTEGER NULL,
    `rucksackVariation` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `male_outfits_outfitNumber_key`(`outfitNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Seed: Create 5 default male outfits
INSERT INTO `male_outfits` (`id`, `outfitNumber`, `name`, `createdAt`, `updatedAt`) VALUES
    (UUID(), 1, 'Outfit 1', NOW(), NOW()),
    (UUID(), 2, 'Outfit 2', NOW(), NOW()),
    (UUID(), 3, 'Outfit 3', NOW(), NOW()),
    (UUID(), 4, 'Outfit 4', NOW(), NOW()),
    (UUID(), 5, 'Outfit 5', NOW(), NOW());

