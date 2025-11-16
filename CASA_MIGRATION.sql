-- Migration: Casa System erstellen
-- Fügt Tabelle für Casa-Bilder hinzu

-- Tabelle für Casa-Bilder
CREATE TABLE IF NOT EXISTS `casa_images` (
  `id` VARCHAR(191) NOT NULL,
  `filename` VARCHAR(255) NOT NULL,
  `path` VARCHAR(500) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verifikation
SELECT 
  'casa_images' as table_name,
  COUNT(*) as image_count
FROM casa_images;
