-- Ändere die Farb-Spalten in rank_clothing_templates von INT auf VARCHAR(50)
-- um Farbnamen statt Zahlen zu speichern

ALTER TABLE `rank_clothing_templates` 
  MODIFY COLUMN `maskColorMale` VARCHAR(50) DEFAULT NULL,
  MODIFY COLUMN `maskColorFemale` VARCHAR(50) DEFAULT NULL,
  MODIFY COLUMN `torsoColorMale` VARCHAR(50) DEFAULT NULL,
  MODIFY COLUMN `torsoColorFemale` VARCHAR(50) DEFAULT NULL,
  MODIFY COLUMN `tshirtColorMale` VARCHAR(50) DEFAULT NULL,
  MODIFY COLUMN `tshirtColorFemale` VARCHAR(50) DEFAULT NULL,
  MODIFY COLUMN `vesteColorMale` VARCHAR(50) DEFAULT NULL,
  MODIFY COLUMN `vesteColorFemale` VARCHAR(50) DEFAULT NULL,
  MODIFY COLUMN `hoseColorMale` VARCHAR(50) DEFAULT NULL,
  MODIFY COLUMN `hoseColorFemale` VARCHAR(50) DEFAULT NULL,
  MODIFY COLUMN `schuheColorMale` VARCHAR(50) DEFAULT NULL,
  MODIFY COLUMN `schuheColorFemale` VARCHAR(50) DEFAULT NULL;

-- Verify the changes
DESCRIBE `rank_clothing_templates`;

