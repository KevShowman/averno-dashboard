-- HOTFIX: Aktualisiere alte Rollen in der Datenbank
-- Führen Sie dieses SQL-Script direkt in der Datenbank aus

-- 1. Aktualisiere discord_role_mappings
UPDATE `discord_role_mappings` 
SET `systemRole` = 'DON_CAPITAN' 
WHERE `systemRole` = 'DON';

UPDATE `discord_role_mappings` 
SET `systemRole` = 'EL_MANO_DERECHA' 
WHERE `systemRole` = 'ASESOR';

-- 2. Lösche ungültige/leere Mappings
DELETE FROM `discord_role_mappings` 
WHERE `systemRole` = '' OR `systemRole` IS NULL;

-- 3. Lösche Mappings für nicht mehr existierende Rollen
DELETE FROM `discord_role_mappings` 
WHERE `systemRole` NOT IN (
  'ADMIN',
  'QUARTIERMEISTER',
  'MITGLIED',
  'GAST',
  'EL_PATRON',
  'DON_CAPITAN',
  'DON_COMANDANTE',
  'EL_MANO_DERECHA',
  'EL_CUSTODIO',
  'EL_MENTOR',
  'EL_ENCARGADO',
  'EL_TENIENTE',
  'SOLDADO',
  'EL_PREFECTO',
  'EL_CONFIDENTE',
  'EL_PROTECTOR',
  'EL_NOVATO',
  'ROUTENVERWALTUNG',
  'LOGISTICA',
  'SICARIO',
  'FUTURO'
);

-- 4. Aktualisiere User-Rollen
UPDATE `users` 
SET `role` = 'DON_CAPITAN' 
WHERE `role` = 'DON';

UPDATE `users` 
SET `role` = 'EL_MANO_DERECHA' 
WHERE `role` = 'ASESOR';

-- 5. Zeige verbleibende Mappings zur Überprüfung
SELECT * FROM `discord_role_mappings`;

