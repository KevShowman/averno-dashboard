-- Setup neue Discord-Rollen-Mappings für die 13 neuen Ränge
-- Dieses Script erstellt oder aktualisiert alle Discord-Rollen-Mappings

-- Leaderschaft
INSERT INTO discord_role_mappings (discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES 
  ('1431388062474309701', 'EL_PATRON', 'El Patrón', true, NOW(), NOW())
ON DUPLICATE KEY UPDATE 
  systemRole = 'EL_PATRON',
  name = 'El Patrón',
  isActive = true,
  updatedAt = NOW();

INSERT INTO discord_role_mappings (discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES 
  ('1431388062474309699', 'DON_CAPITAN', 'Don - El Capitán', true, NOW(), NOW())
ON DUPLICATE KEY UPDATE 
  systemRole = 'DON_CAPITAN',
  name = 'Don - El Capitán',
  isActive = true,
  updatedAt = NOW();

INSERT INTO discord_role_mappings (discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES 
  ('1431388062474309700', 'DON_COMANDANTE', 'Don - El Comandante', true, NOW(), NOW())
ON DUPLICATE KEY UPDATE 
  systemRole = 'DON_COMANDANTE',
  name = 'Don - El Comandante',
  isActive = true,
  updatedAt = NOW();

INSERT INTO discord_role_mappings (discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES 
  ('1431388062474309698', 'EL_MANO_DERECHA', 'El Mano Derecha', true, NOW(), NOW())
ON DUPLICATE KEY UPDATE 
  systemRole = 'EL_MANO_DERECHA',
  name = 'El Mano Derecha',
  isActive = true,
  updatedAt = NOW();

-- Ränge 7-9
INSERT INTO discord_role_mappings (discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES 
  ('1431388062427906229', 'EL_CUSTODIO', '9 | El Custodio', true, NOW(), NOW())
ON DUPLICATE KEY UPDATE 
  systemRole = 'EL_CUSTODIO',
  name = '9 | El Custodio',
  isActive = true,
  updatedAt = NOW();

INSERT INTO discord_role_mappings (discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES 
  ('1431388062427906230', 'EL_MENTOR', '8 | El Mentor', true, NOW(), NOW())
ON DUPLICATE KEY UPDATE 
  systemRole = 'EL_MENTOR',
  name = '8 | El Mentor',
  isActive = true,
  updatedAt = NOW();

INSERT INTO discord_role_mappings (discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES 
  ('1431388062427906231', 'EL_ENCARGADO', '7 | El Encargado', true, NOW(), NOW())
ON DUPLICATE KEY UPDATE 
  systemRole = 'EL_ENCARGADO',
  name = '7 | El Encargado',
  isActive = true,
  updatedAt = NOW();

-- Ränge 4-6
INSERT INTO discord_role_mappings (discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES 
  ('1431388062427906232', 'EL_TENIENTE', '6 | El Teniente', true, NOW(), NOW())
ON DUPLICATE KEY UPDATE 
  systemRole = 'EL_TENIENTE',
  name = '6 | El Teniente',
  isActive = true,
  updatedAt = NOW();

INSERT INTO discord_role_mappings (discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES 
  ('1431388062427906220', 'SOLDADO', '5 | Soldado', true, NOW(), NOW())
ON DUPLICATE KEY UPDATE 
  systemRole = 'SOLDADO',
  name = '5 | Soldado',
  isActive = true,
  updatedAt = NOW();

INSERT INTO discord_role_mappings (discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES 
  ('1431388062427906233', 'EL_PREFECTO', '4 | El Prefecto', true, NOW(), NOW())
ON DUPLICATE KEY UPDATE 
  systemRole = 'EL_PREFECTO',
  name = '4 | El Prefecto',
  isActive = true,
  updatedAt = NOW();

-- Ränge 1-3
INSERT INTO discord_role_mappings (discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES 
  ('1431388062427906234', 'EL_CONFIDENTE', '3 | El Confidente', true, NOW(), NOW())
ON DUPLICATE KEY UPDATE 
  systemRole = 'EL_CONFIDENTE',
  name = '3 | El Confidente',
  isActive = true,
  updatedAt = NOW();

INSERT INTO discord_role_mappings (discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES 
  ('1431388062427906235', 'EL_PROTECTOR', '2 | El Protector', true, NOW(), NOW())
ON DUPLICATE KEY UPDATE 
  systemRole = 'EL_PROTECTOR',
  name = '2 | El Protector',
  isActive = true,
  updatedAt = NOW();

INSERT INTO discord_role_mappings (discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES 
  ('1431388062427906236', 'EL_NOVATO', '1 | El Novato', true, NOW(), NOW())
ON DUPLICATE KEY UPDATE 
  systemRole = 'EL_NOVATO',
  name = '1 | El Novato',
  isActive = true,
  updatedAt = NOW();

-- Legacy/Spezialrollen (falls noch vorhanden)
INSERT INTO discord_role_mappings (discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES 
  ('1431388062474309697', 'ROUTENVERWALTUNG', 'Inspector', true, NOW(), NOW())
ON DUPLICATE KEY UPDATE 
  systemRole = 'ROUTENVERWALTUNG',
  name = 'Inspector',
  isActive = true,
  updatedAt = NOW();

INSERT INTO discord_role_mappings (discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES 
  ('1431388062449139715', 'ROUTENVERWALTUNG', 'Routenverwaltung', true, NOW(), NOW())
ON DUPLICATE KEY UPDATE 
  systemRole = 'ROUTENVERWALTUNG',
  name = 'Routenverwaltung',
  isActive = true,
  updatedAt = NOW();

INSERT INTO discord_role_mappings (discordRoleId, systemRole, name, isActive, createdAt, updatedAt)
VALUES 
  ('1431388062449139716', 'SICARIO', 'Sicario', true, NOW(), NOW())
ON DUPLICATE KEY UPDATE 
  systemRole = 'SICARIO',
  name = 'Sicario',
  isActive = true,
  updatedAt = NOW();

-- Zeige alle Mappings an
SELECT 
  discordRoleId,
  systemRole,
  name,
  isActive,
  updatedAt
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

