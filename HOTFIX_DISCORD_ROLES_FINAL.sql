-- HOTFIX: Korrigiere die Discord-Rollen-Mappings

-- 1. Korrigiere die falsch zugeordnete Rolle (1431388062474309699 sollte DON_CAPITAN sein, nicht EL_NOVATO)
UPDATE discord_role_mappings 
SET systemRole = 'DON_CAPITAN', name = 'Don - El Capitán', updatedAt = NOW()
WHERE discordRoleId = '1431388062474309699';

-- 2. Lösche die doppelten/falschen Einträge ohne ID
DELETE FROM discord_role_mappings 
WHERE id IS NULL OR id = '';

-- 3. Prüfe ob DON_COMANDANTE existiert, falls nicht hinzufügen
INSERT IGNORE INTO discord_role_mappings (id, discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES (UUID(), '1431388062474309700', 'DON_COMANDANTE', 'Don - El Comandante', 1, NOW(), NOW());

-- 4. Prüfe ob EL_MANO_DERECHA existiert
INSERT IGNORE INTO discord_role_mappings (id, discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES (UUID(), '1431388062474309698', 'EL_MANO_DERECHA', 'El Mano Derecha', 1, NOW(), NOW());

-- 5. Füge alle Rang-Rollen hinzu (mit korrekter ID)
INSERT IGNORE INTO discord_role_mappings (id, discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES 
  (UUID(), '1431388062427906229', 'EL_CUSTODIO', '9 | El Custodio', 1, NOW(), NOW()),
  (UUID(), '1431388062427906230', 'EL_MENTOR', '8 | El Mentor', 1, NOW(), NOW()),
  (UUID(), '1431388062427906231', 'EL_ENCARGADO', '7 | El Encargado', 1, NOW(), NOW()),
  (UUID(), '1431388062427906232', 'EL_TENIENTE', '6 | El Teniente', 1, NOW(), NOW()),
  (UUID(), '1431388062427906233', 'EL_PREFECTO', '4 | El Prefecto', 1, NOW(), NOW()),
  (UUID(), '1431388062427906234', 'EL_CONFIDENTE', '3 | El Confidente', 1, NOW(), NOW()),
  (UUID(), '1431388062427906235', 'EL_PROTECTOR', '2 | El Protector', 1, NOW(), NOW()),
  (UUID(), '1431388062427906236', 'EL_NOVATO', '1 | El Novato', 1, NOW(), NOW());

-- Zeige alle Mappings sortiert nach Rang
SELECT 
  id,
  discordRoleId,
  systemRole,
  name,
  isActive
FROM discord_role_mappings
ORDER BY 
  CASE systemRole
    WHEN 'EL_PATRON' THEN 1
    WHEN 'DON_CAPITAN' THEN 2
    WHEN 'DON_COMANDANTE' THEN 3
    WHEN 'EL_MANO_DERECHA' THEN 4
    WHEN 'EL_CUSTODIO' THEN 5
    WHEN 'EL_MENTOR' THEN 6
    WHEN 'EL_ENCARGADO' THEN 7
    WHEN 'EL_TENIENTE' THEN 8
    WHEN 'SOLDADO' THEN 9
    WHEN 'EL_PREFECTO' THEN 10
    WHEN 'EL_CONFIDENTE' THEN 11
    WHEN 'EL_PROTECTOR' THEN 12
    WHEN 'EL_NOVATO' THEN 13
    ELSE 99
  END;

