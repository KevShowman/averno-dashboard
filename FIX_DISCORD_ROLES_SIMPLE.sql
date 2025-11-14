-- Korrigiere die bestehenden Mappings und füge die neuen hinzu

-- 1. Korrigiere die falsche Zuordnung (1431388062474309699 ist aktuell SICARIO, sollte DON_CAPITAN sein)
UPDATE discord_role_mappings 
SET systemRole = 'DON_CAPITAN', name = 'Don - El Capitán', updatedAt = NOW()
WHERE discordRoleId = '1431388062474309699';

-- 2. Füge DON_COMANDANTE hinzu (falls Discord-Rolle existiert)
INSERT INTO discord_role_mappings (discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES ('1431388062474309700', 'DON_COMANDANTE', 'Don - El Comandante', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE systemRole = 'DON_COMANDANTE', name = 'Don - El Comandante', updatedAt = NOW();

-- 3. Füge EL_MANO_DERECHA hinzu (1431388062474309698)
INSERT INTO discord_role_mappings (discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES ('1431388062474309698', 'EL_MANO_DERECHA', 'El Mano Derecha', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE systemRole = 'EL_MANO_DERECHA', name = 'El Mano Derecha', updatedAt = NOW();

-- 4. Füge alle neuen Rang-Rollen hinzu
INSERT INTO discord_role_mappings (discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES ('1431388062427906229', 'EL_CUSTODIO', '9 | El Custodio', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE systemRole = 'EL_CUSTODIO', name = '9 | El Custodio', updatedAt = NOW();

INSERT INTO discord_role_mappings (discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES ('1431388062427906230', 'EL_MENTOR', '8 | El Mentor', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE systemRole = 'EL_MENTOR', name = '8 | El Mentor', updatedAt = NOW();

INSERT INTO discord_role_mappings (discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES ('1431388062427906231', 'EL_ENCARGADO', '7 | El Encargado', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE systemRole = 'EL_ENCARGADO', name = '7 | El Encargado', updatedAt = NOW();

INSERT INTO discord_role_mappings (discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES ('1431388062427906232', 'EL_TENIENTE', '6 | El Teniente', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE systemRole = 'EL_TENIENTE', name = '6 | El Teniente', updatedAt = NOW();

INSERT INTO discord_role_mappings (discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES ('1431388062427906233', 'EL_PREFECTO', '4 | El Prefecto', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE systemRole = 'EL_PREFECTO', name = '4 | El Prefecto', updatedAt = NOW();

INSERT INTO discord_role_mappings (discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES ('1431388062427906234', 'EL_CONFIDENTE', '3 | El Confidente', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE systemRole = 'EL_CONFIDENTE', name = '3 | El Confidente', updatedAt = NOW();

INSERT INTO discord_role_mappings (discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES ('1431388062427906235', 'EL_PROTECTOR', '2 | El Protector', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE systemRole = 'EL_PROTECTOR', name = '2 | El Protector', updatedAt = NOW();

INSERT INTO discord_role_mappings (discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES ('1431388062427906236', 'EL_NOVATO', '1 | El Novato', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE systemRole = 'EL_NOVATO', name = '1 | El Novato', updatedAt = NOW();

-- Zeige alle Mappings
SELECT * FROM discord_role_mappings ORDER BY systemRole;

