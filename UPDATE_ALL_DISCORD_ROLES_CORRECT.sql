-- KOMPLETTES UPDATE mit den ECHTEN Discord-Rollen-IDs
-- Zuerst alle alten/falschen Rollen deaktivieren
UPDATE discord_role_mappings SET isActive = 0 WHERE isActive = 1;

-- Deaktiviere die Base Member Role (1431388062427906220) permanent
-- Diese Rolle haben ALLE Member, daher darf sie NICHT für die Rollen-Zuordnung verwendet werden
UPDATE discord_role_mappings SET isActive = 0 WHERE discordRoleId = '1431388062427906220';

-- Deaktiviere auch die Container-Rollen (nur zur Organisation, keine echten Rollen)
UPDATE discord_role_mappings SET isActive = 0 WHERE discordRoleId = '1431388062449139712'; -- "NORMALE ROLLEN"
UPDATE discord_role_mappings SET isActive = 0 WHERE discordRoleId = '1431388062427906227'; -- Unbekannte Container-Rolle
UPDATE discord_role_mappings SET isActive = 0 WHERE discordRoleId = '1431388062474309695'; -- "FUNKTIONSROLLEN"
UPDATE discord_role_mappings SET isActive = 0 WHERE discordRoleId = '1431388062109274176'; -- "BEKANNT INAKTIV"
UPDATE discord_role_mappings SET isActive = 0 WHERE discordRoleId = '1431388062109274175'; -- Weitere unbekannte Rolle

-- Dann die KORREKTEN Rollen hinzufügen/aktualisieren

-- LEADERSCHAFT
INSERT INTO discord_role_mappings (id, discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES (UUID(), '1431388062474309701', 'EL_PATRON', '👑 El Patrón', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE systemRole = 'EL_PATRON', name = '👑 El Patrón', isActive = 1, updatedAt = NOW();

INSERT INTO discord_role_mappings (id, discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES (UUID(), '1431388062474309699', 'DON_CAPITAN', '⚔️ Don - El Capitán', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE systemRole = 'DON_CAPITAN', name = '⚔️ Don - El Capitán', isActive = 1, updatedAt = NOW();

INSERT INTO discord_role_mappings (id, discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES (UUID(), '1438638866432135348', 'DON_COMANDANTE', '🛡️ Don - El Comandante', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE systemRole = 'DON_COMANDANTE', name = '🛡️ Don - El Comandante', isActive = 1, updatedAt = NOW();

INSERT INTO discord_role_mappings (id, discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES (UUID(), '1431388062474309698', 'EL_MANO_DERECHA', '🤝 El Mano Derecha', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE systemRole = 'EL_MANO_DERECHA', name = '🤝 El Mano Derecha', isActive = 1, updatedAt = NOW();

-- RÄNGE 7-9
INSERT INTO discord_role_mappings (id, discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES (UUID(), '1431388062427906229', 'EL_CUSTODIO', '🔒 9 | El Custodio', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE systemRole = 'EL_CUSTODIO', name = '🔒 9 | El Custodio', isActive = 1, updatedAt = NOW();

INSERT INTO discord_role_mappings (id, discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES (UUID(), '1438641189372035092', 'EL_MENTOR', '📚 8 | El Mentor', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE systemRole = 'EL_MENTOR', name = '📚 8 | El Mentor', isActive = 1, updatedAt = NOW();

INSERT INTO discord_role_mappings (id, discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES (UUID(), '1438641369038979295', 'EL_ENCARGADO', '🧰 7 | El Encargado', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE systemRole = 'EL_ENCARGADO', name = '🧰 7 | El Encargado', isActive = 1, updatedAt = NOW();

-- RÄNGE 4-6
INSERT INTO discord_role_mappings (id, discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES (UUID(), '1438637584975921286', 'EL_TENIENTE', '⭐ 6 | El Teniente', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE systemRole = 'EL_TENIENTE', name = '⭐ 6 | El Teniente', isActive = 1, updatedAt = NOW();

INSERT INTO discord_role_mappings (id, discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES (UUID(), '1431388062427906228', 'SOLDADO', '🧭 5 | Soldado', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE systemRole = 'SOLDADO', name = '🧭 5 | Soldado', isActive = 1, updatedAt = NOW();

INSERT INTO discord_role_mappings (id, discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES (UUID(), '1438642330532839596', 'EL_PREFECTO', '🐍 4 | El Prefecto', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE systemRole = 'EL_PREFECTO', name = '🐍 4 | El Prefecto', isActive = 1, updatedAt = NOW();

-- RÄNGE 1-3
INSERT INTO discord_role_mappings (id, discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES (UUID(), '1438641614481264743', 'EL_CONFIDENTE', '🫢 3 | El Confidente', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE systemRole = 'EL_CONFIDENTE', name = '🫢 3 | El Confidente', isActive = 1, updatedAt = NOW();

INSERT INTO discord_role_mappings (id, discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES (UUID(), '1438639256275914752', 'EL_PROTECTOR', '🐢 2 | El Protector', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE systemRole = 'EL_PROTECTOR', name = '🐢 2 | El Protector', isActive = 1, updatedAt = NOW();

INSERT INTO discord_role_mappings (id, discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES (UUID(), '1438636794181718199', 'EL_NOVATO', '🌱 1 | El Novato', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE systemRole = 'EL_NOVATO', name = '🌱 1 | El Novato', isActive = 1, updatedAt = NOW();

-- LEGACY (falls benötigt)
INSERT INTO discord_role_mappings (id, discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES (UUID(), '1431388062474309697', 'ROUTENVERWALTUNG', 'Inspector', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE systemRole = 'ROUTENVERWALTUNG', name = 'Inspector', isActive = 1, updatedAt = NOW();

INSERT INTO discord_role_mappings (id, discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES (UUID(), '1431388062449139715', 'ROUTENVERWALTUNG', 'Routenverwaltung', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE systemRole = 'ROUTENVERWALTUNG', name = 'Routenverwaltung', isActive = 1, updatedAt = NOW();

INSERT INTO discord_role_mappings (id, discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES (UUID(), '1431388062449139716', 'SICARIO', 'Sicario', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE systemRole = 'SICARIO', name = 'Sicario', isActive = 1, updatedAt = NOW();

-- Zeige alle aktiven Rollen sortiert nach Hierarchie
SELECT 
  discordRoleId,
  systemRole,
  name,
  isActive
FROM discord_role_mappings
WHERE isActive = 1
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

