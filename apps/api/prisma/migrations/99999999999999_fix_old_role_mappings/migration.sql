-- Migration: Fix old role mappings
-- Aktualisiert alte DON und ASESOR Rollen zu neuen Rollen

-- Aktualisiere alte DON Mappings zu DON_CAPITAN
UPDATE `discord_role_mappings` 
SET `systemRole` = 'DON_CAPITAN' 
WHERE `systemRole` = 'DON';

-- Aktualisiere alte ASESOR Mappings zu EL_MANO_DERECHA
UPDATE `discord_role_mappings` 
SET `systemRole` = 'EL_MANO_DERECHA' 
WHERE `systemRole` = 'ASESOR';

-- Lösche ungültige Mappings (leere oder unbekannte Werte)
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

-- Aktualisiere User mit alten Rollen zu neuen Rollen
UPDATE `users` 
SET `role` = 'DON_CAPITAN' 
WHERE `role` = 'DON';

UPDATE `users` 
SET `role` = 'EL_MANO_DERECHA' 
WHERE `role` = 'ASESOR';

-- Aktualisiere allRoles JSON arrays in users
-- Hinweis: Dies kann komplexer sein, je nachdem wie die JSON-Daten strukturiert sind
-- In MySQL kann man JSON_REPLACE verwenden, aber das ist kompliziert
-- Besser: Users neu synchronisieren lassen

