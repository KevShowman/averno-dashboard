-- Aufstellungssystem
-- Tabelle für Aufstellungen
CREATE TABLE `aufstellungen` (
  `id` VARCHAR(191) NOT NULL,
  `createdById` VARCHAR(191) NOT NULL,
  `date` DATETIME(3) NOT NULL,
  `reason` VARCHAR(191) NOT NULL,
  `deadline` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `aufstellungen_createdById_idx` (`createdById`),
  CONSTRAINT `aufstellungen_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Tabelle für Aufstellungs-Antworten
CREATE TABLE `aufstellung_responses` (
  `id` VARCHAR(191) NOT NULL,
  `aufstellungId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `status` ENUM('COMING', 'NOT_COMING', 'UNSURE') NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `aufstellung_responses_aufstellungId_userId_key` (`aufstellungId`, `userId`),
  INDEX `aufstellung_responses_aufstellungId_idx` (`aufstellungId`),
  INDEX `aufstellung_responses_userId_idx` (`userId`),
  CONSTRAINT `aufstellung_responses_aufstellungId_fkey` FOREIGN KEY (`aufstellungId`) REFERENCES `aufstellungen`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `aufstellung_responses_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

