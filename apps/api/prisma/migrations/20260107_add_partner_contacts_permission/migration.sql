-- AlterTable: Add partnerCanViewContacts to User
ALTER TABLE `users` ADD COLUMN `partnerCanViewContacts` BOOLEAN NOT NULL DEFAULT FALSE;
