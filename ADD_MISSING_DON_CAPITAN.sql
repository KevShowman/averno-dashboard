-- Füge die fehlende DON_CAPITAN Rolle hinzu
INSERT INTO discord_role_mappings (id, discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES (UUID(), '1431388062474309699', 'DON_CAPITAN', 'Don - El Capitán', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE 
  systemRole = 'DON_CAPITAN',
  name = 'Don - El Capitán',
  updatedAt = NOW();

-- Zeige alle Mappings
SELECT * FROM discord_role_mappings WHERE systemRole LIKE 'DON%' OR systemRole LIKE 'EL_%' ORDER BY systemRole;

