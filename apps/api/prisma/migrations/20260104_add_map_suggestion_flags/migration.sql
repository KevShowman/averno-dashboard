-- AlterTable: Add isKeyFamily and isOutdated to map_suggestions
ALTER TABLE `map_suggestions` ADD COLUMN `isKeyFamily` BOOLEAN NOT NULL DEFAULT FALSE,
                              ADD COLUMN `isOutdated` BOOLEAN NOT NULL DEFAULT FALSE;
