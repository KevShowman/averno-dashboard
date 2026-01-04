-- AlterTable: Add direct isKeyFamily and isOutdated flags to MapAnnotation
-- These flags allow marking POIs as key families or outdated without needing a linked FamilyContact

ALTER TABLE `map_annotations` ADD COLUMN `isKeyFamily` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `map_annotations` ADD COLUMN `isOutdated` BOOLEAN NOT NULL DEFAULT false;
