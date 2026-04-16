-- Umbenennung von Kokain zu Packages
-- Rename kokain_deposits table to package_deposits
ALTER TABLE `kokain_deposits` RENAME TO `package_deposits`;

-- Rename kokain_uebergaben table to package_handovers
ALTER TABLE `kokain_uebergaben` RENAME TO `package_handovers`;

-- Optional: Update settings key for package price
UPDATE `settings` SET `key` = 'package_price_per_unit' WHERE `key` = 'kokain_price_per_package';

