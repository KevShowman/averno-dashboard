-- Zeige aktuelle Spaltenstruktur
SHOW CREATE TABLE discord_role_mappings;

-- Vergrößere die systemRole-Spalte
ALTER TABLE discord_role_mappings 
MODIFY COLUMN systemRole VARCHAR(50) NULL;

-- Jetzt nochmal die Updates
UPDATE discord_role_mappings 
SET systemRole = 'RUTAS', updatedAt = NOW()
WHERE discordRoleId = '1431388062449139715';

UPDATE discord_role_mappings 
SET systemRole = 'SICARIO', updatedAt = NOW()
WHERE discordRoleId = '1431388062449139716';

UPDATE discord_role_mappings 
SET systemRole = 'CONSEJERO', updatedAt = NOW()
WHERE discordRoleId = '1431388062449139719';

UPDATE discord_role_mappings 
SET systemRole = 'CONTACTO', updatedAt = NOW()
WHERE discordRoleId = '1431388062449139714';

UPDATE discord_role_mappings 
SET systemRole = 'FORMACION', updatedAt = NOW()
WHERE discordRoleId = '1431388062449139717';

UPDATE discord_role_mappings 
SET systemRole = 'INTELIGENCIA', updatedAt = NOW()
WHERE discordRoleId = '1431388062449139718';

UPDATE discord_role_mappings 
SET systemRole = 'LOGISTICA', updatedAt = NOW()
WHERE discordRoleId = '1431388062474309700';

-- Verifikation
SELECT 
  discordRoleId,
  systemRole,
  name,
  CHAR_LENGTH(systemRole) as len
FROM discord_role_mappings 
WHERE discordRoleId IN (
  '1431388062449139715', '1431388062449139716', '1431388062449139719',
  '1431388062449139714', '1431388062449139717', '1431388062449139718',
  '1431388062474309700'
)
ORDER BY name;

