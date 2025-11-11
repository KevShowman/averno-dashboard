-- Migration: Füge tourCount und updatedAt zu familiensammeln_participations hinzu
-- Datum: 2025-11-11
-- Beschreibung: Ermöglicht das Tracking von mehreren Touren pro Tag und Person

-- Schritt 1: Füge tourCount Spalte hinzu mit Default-Wert 1
ALTER TABLE `familiensammeln_participations` 
ADD COLUMN `tourCount` INT NOT NULL DEFAULT 1 AFTER `date`;

-- Schritt 2: Füge updatedAt Spalte hinzu MIT DEFAULT VALUE
ALTER TABLE `familiensammeln_participations` 
ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) AFTER `createdAt`;

