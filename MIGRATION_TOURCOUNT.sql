-- Migration: Füge tourCount Feld zu familiensammeln_participations hinzu
-- Datum: 2025-11-11
-- Beschreibung: Ermöglicht das Tracking von mehreren Touren pro Tag und Person

-- Füge tourCount Spalte hinzu mit Default-Wert 1
ALTER TABLE `familiensammeln_participations` 
ADD COLUMN `tourCount` INT NOT NULL DEFAULT 1 AFTER `date`;

-- Füge updatedAt Spalte hinzu (falls nicht vorhanden)
ALTER TABLE `familiensammeln_participations` 
ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) AFTER `createdAt`;

-- Optional: Setze alle bestehenden Einträge auf tourCount = 1
UPDATE `familiensammeln_participations` SET `tourCount` = 1 WHERE `tourCount` IS NULL;

