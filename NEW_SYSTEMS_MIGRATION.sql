-- Migration für neue Systeme: Aktensystem
-- Funk/DarkChat nutzt bereits existierende Settings-Tabelle
-- Fahrzeugtuning-Daten sind hardcoded im Backend

-- Aktensystem Tabellen erstellen
CREATE TABLE IF NOT EXISTS `member_files` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `lastUprankDate` DATETIME(3) NULL,
  `isArchived` BOOLEAN NOT NULL DEFAULT false,
  `archivedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`),
  UNIQUE INDEX `member_files_userId_key` (`userId`),
  INDEX `member_files_userId_idx` (`userId`),
  CONSTRAINT `member_files_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `member_file_entries` (
  `id` VARCHAR(191) NOT NULL,
  `fileId` VARCHAR(191) NOT NULL,
  `type` ENUM('POSITIVE', 'NEGATIVE', 'NEUTRAL') NOT NULL,
  `content` TEXT NOT NULL,
  `createdById` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`),
  INDEX `member_file_entries_fileId_idx` (`fileId`),
  INDEX `member_file_entries_createdById_idx` (`createdById`),
  CONSTRAINT `member_file_entries_fileId_fkey` FOREIGN KEY (`fileId`) REFERENCES `member_files`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `member_file_entries_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initiale Funk/DarkChat Einstellungen (falls nicht vorhanden)
INSERT INTO `settings` (`id`, `key`, `value`, `type`, `createdAt`, `updatedAt`)
VALUES 
  (UUID(), 'funk_frequency', '"00100200321"', 'string', NOW(), NOW()),
  (UUID(), 'darkchat_name', '"LsCFuT25veRDc!2§"', 'string', NOW(), NOW())
ON DUPLICATE KEY UPDATE `key` = `key`; -- Ignoriere wenn bereits vorhanden

