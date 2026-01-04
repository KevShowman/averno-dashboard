-- AlterTable: Add isKeyFamily and isOutdated to partner_family_suggestions
ALTER TABLE `partner_family_suggestions` ADD COLUMN `isKeyFamily` BOOLEAN NOT NULL DEFAULT FALSE,
                                         ADD COLUMN `isOutdated` BOOLEAN NOT NULL DEFAULT FALSE;
