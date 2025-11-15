-- ==========================================
-- COMPLETE UPDATE SQL
-- Funktionsrollen + Gender + Clothing
-- ==========================================

-- 1. Füge Gender-Spalte zu users hinzu
ALTER TABLE users 
ADD COLUMN gender ENUM('MALE', 'FEMALE') DEFAULT 'MALE' AFTER email;

-- 2. Lösche alte user_clothing Tabelle (nicht mehr benötigt)
DROP TABLE IF EXISTS user_clothing;

-- 3. Lösche alte rank_clothing_templates Tabelle
DROP TABLE IF EXISTS rank_clothing_templates;

-- 4. Erstelle neue rank_clothing_templates mit Male/Female Support
CREATE TABLE rank_clothing_templates (
  id VARCHAR(191) NOT NULL,
  rankGroup VARCHAR(191) NOT NULL,
  
  -- Maske (Männer)
  maskItemMale INT NULL,
  maskVariationMale INT NULL,
  maskCustomizableMale BOOLEAN NOT NULL DEFAULT false,
  maskColorMale INT NULL,
  
  -- Maske (Frauen)
  maskItemFemale INT NULL,
  maskVariationFemale INT NULL,
  maskCustomizableFemale BOOLEAN NOT NULL DEFAULT false,
  maskColorFemale INT NULL,
  
  -- Torso (Männer)
  torsoItemMale INT NULL,
  torsoVariationMale INT NULL,
  torsoCustomizableMale BOOLEAN NOT NULL DEFAULT false,
  torsoColorMale INT NULL,
  
  -- Torso (Frauen)
  torsoItemFemale INT NULL,
  torsoVariationFemale INT NULL,
  torsoCustomizableFemale BOOLEAN NOT NULL DEFAULT false,
  torsoColorFemale INT NULL,
  
  -- T-Shirt (Männer)
  tshirtItemMale INT NULL,
  tshirtVariationMale INT NULL,
  tshirtCustomizableMale BOOLEAN NOT NULL DEFAULT false,
  tshirtColorMale INT NULL,
  
  -- T-Shirt (Frauen)
  tshirtItemFemale INT NULL,
  tshirtVariationFemale INT NULL,
  tshirtCustomizableFemale BOOLEAN NOT NULL DEFAULT false,
  tshirtColorFemale INT NULL,
  
  -- Weste (Männer)
  vesteItemMale INT NULL,
  vesteVariationMale INT NULL,
  vesteCustomizableMale BOOLEAN NOT NULL DEFAULT false,
  vesteColorMale INT NULL,
  
  -- Weste (Frauen)
  vesteItemFemale INT NULL,
  vesteVariationFemale INT NULL,
  vesteCustomizableFemale BOOLEAN NOT NULL DEFAULT false,
  vesteColorFemale INT NULL,
  
  -- Hose (Männer)
  hoseItemMale INT NULL,
  hoseVariationMale INT NULL,
  hoseCustomizableMale BOOLEAN NOT NULL DEFAULT false,
  hoseColorMale INT NULL,
  
  -- Hose (Frauen)
  hoseItemFemale INT NULL,
  hoseVariationFemale INT NULL,
  hoseCustomizableFemale BOOLEAN NOT NULL DEFAULT false,
  hoseColorFemale INT NULL,
  
  -- Schuhe (Männer)
  schuheItemMale INT NULL,
  schuheVariationMale INT NULL,
  schuheCustomizableMale BOOLEAN NOT NULL DEFAULT false,
  schuheColorMale INT NULL,
  
  -- Schuhe (Frauen)
  schuheItemFemale INT NULL,
  schuheVariationFemale INT NULL,
  schuheCustomizableFemale BOOLEAN NOT NULL DEFAULT false,
  schuheColorFemale INT NULL,
  
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL,
  
  PRIMARY KEY (id),
  UNIQUE KEY rank_clothing_templates_rankGroup_key (rankGroup)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Füge Funktionsrollen-Mappings hinzu

-- Consejero/a
INSERT INTO discord_role_mappings (id, discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES (
  'clz-consejero-mapping',
  '1431388062449139719',
  'CONSEJERO',
  'Consejero/a',
  1,
  NOW(),
  NOW()
) ON DUPLICATE KEY UPDATE
  discordRoleId = '1431388062449139719',
  systemRole = 'CONSEJERO',
  name = 'Consejero/a',
  isActive = 1,
  updatedAt = NOW();

-- Rutas
INSERT INTO discord_role_mappings (id, discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES (
  'clz-rutas-mapping',
  '1431388062449139715',
  'RUTAS',
  'Rutas',
  1,
  NOW(),
  NOW()
) ON DUPLICATE KEY UPDATE
  discordRoleId = '1431388062449139715',
  systemRole = 'RUTAS',
  name = 'Rutas',
  isActive = 1,
  updatedAt = NOW();

-- Logística
INSERT INTO discord_role_mappings (id, discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES (
  'clz-logistica-mapping',
  '1431388062474309700',
  'LOGISTICA',
  'Logística',
  1,
  NOW(),
  NOW()
) ON DUPLICATE KEY UPDATE
  discordRoleId = '1431388062474309700',
  systemRole = 'LOGISTICA',
  name = 'Logística',
  isActive = 1,
  updatedAt = NOW();

-- Inteligencia
INSERT INTO discord_role_mappings (id, discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES (
  'clz-inteligencia-mapping',
  '1431388062449139718',
  'INTELIGENCIA',
  'Inteligencia',
  1,
  NOW(),
  NOW()
) ON DUPLICATE KEY UPDATE
  discordRoleId = '1431388062449139718',
  systemRole = 'INTELIGENCIA',
  name = 'Inteligencia',
  isActive = 1,
  updatedAt = NOW();

-- Formación
INSERT INTO discord_role_mappings (id, discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES (
  'clz-formacion-mapping',
  '1431388062449139717',
  'FORMACION',
  'Formación',
  1,
  NOW(),
  NOW()
) ON DUPLICATE KEY UPDATE
  discordRoleId = '1431388062449139717',
  systemRole = 'FORMACION',
  name = 'Formación',
  isActive = 1,
  updatedAt = NOW();

-- Sicario
INSERT INTO discord_role_mappings (id, discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES (
  'clz-sicario-mapping',
  '1431388062449139716',
  'SICARIO',
  'Sicario',
  1,
  NOW(),
  NOW()
) ON DUPLICATE KEY UPDATE
  discordRoleId = '1431388062449139716',
  systemRole = 'SICARIO',
  name = 'Sicario',
  isActive = 1,
  updatedAt = NOW();

-- Contacto
INSERT INTO discord_role_mappings (id, discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES (
  'clz-contacto-mapping',
  '1431388062449139714',
  'CONTACTO',
  'Contacto',
  1,
  NOW(),
  NOW()
) ON DUPLICATE KEY UPDATE
  discordRoleId = '1431388062449139714',
  systemRole = 'CONTACTO',
  name = 'Contacto',
  isActive = 1,
  updatedAt = NOW();

-- 6. Optional: Lösche alte organigramm_assignments (da jetzt automatisch aus user.allRoles)
-- DELETE FROM organigramm_assignments;

SELECT 'Migration completed successfully!' as status;

