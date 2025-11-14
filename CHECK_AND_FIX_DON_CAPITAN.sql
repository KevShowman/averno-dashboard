-- Prüfe ob DON_CAPITAN existiert
SELECT * FROM discord_role_mappings WHERE systemRole = 'DON_CAPITAN';

-- Falls nicht, füge es hinzu
INSERT INTO discord_role_mappings (id, discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES (UUID(), '1431388062474309699', 'DON_CAPITAN', 'Don - El Capitán', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE 
  systemRole = 'DON_CAPITAN',
  name = 'Don - El Capitán',
  isActive = 1,
  updatedAt = NOW();

-- Zeige alle Leadership-Rollen
SELECT discordRoleId, systemRole, name FROM discord_role_mappings 
WHERE systemRole IN ('EL_PATRON', 'DON_CAPITAN', 'DON_COMANDANTE', 'EL_MANO_DERECHA')
ORDER BY systemRole;

