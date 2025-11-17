-- Migration: Füge Rucksack zum Clothing System hinzu
-- Datum: 2025-11-17

-- Füge Rucksack-Felder für Männer zur RankClothingTemplate-Tabelle hinzu
ALTER TABLE `rank_clothing_templates` 
  ADD COLUMN `rucksackItemMale` INT NULL AFTER `schuheColorFemale`,
  ADD COLUMN `rucksackVariationMale` INT NULL AFTER `rucksackItemMale`,
  ADD COLUMN `rucksackCustomizableMale` BOOLEAN NOT NULL DEFAULT FALSE AFTER `rucksackVariationMale`,
  ADD COLUMN `rucksackColorMale` VARCHAR(191) NULL AFTER `rucksackCustomizableMale`;

-- Füge Rucksack-Felder für Frauen zur RankClothingTemplate-Tabelle hinzu
ALTER TABLE `rank_clothing_templates`
  ADD COLUMN `rucksackItemFemale` INT NULL AFTER `rucksackColorMale`,
  ADD COLUMN `rucksackVariationFemale` INT NULL AFTER `rucksackItemFemale`,
  ADD COLUMN `rucksackCustomizableFemale` BOOLEAN NOT NULL DEFAULT FALSE AFTER `rucksackVariationFemale`,
  ADD COLUMN `rucksackColorFemale` VARCHAR(191) NULL AFTER `rucksackCustomizableFemale`;

-- Bestätige die Änderungen
SELECT 'Rucksack-Felder erfolgreich zum Clothing System hinzugefügt!' AS Status;

