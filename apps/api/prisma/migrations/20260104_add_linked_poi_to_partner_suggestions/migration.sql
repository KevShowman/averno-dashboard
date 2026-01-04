-- AlterTable: Add linkedMapAnnotationId to PartnerFamilySuggestion
-- Allows partners to link their family suggestion to an existing POI

ALTER TABLE `partner_family_suggestions` ADD COLUMN `linkedMapAnnotationId` VARCHAR(191) NULL;
