-- Füge Funktionsrollen-Mappings hinzu

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

