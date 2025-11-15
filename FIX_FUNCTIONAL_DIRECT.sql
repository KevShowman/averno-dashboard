-- Direkte Updates mit ALLEN Spalten

-- 1. Rutas
UPDATE discord_role_mappings 
SET 
  systemRole = 'RUTAS',
  name = '🚛 Rutas',
  updatedAt = NOW()
WHERE discordRoleId = '1431388062449139715';

-- 2. Sicario  
UPDATE discord_role_mappings 
SET 
  systemRole = 'SICARIO',
  name = '🔫 Sicario',
  updatedAt = NOW()
WHERE discordRoleId = '1431388062449139716';

-- 3. Consejero
UPDATE discord_role_mappings 
SET 
  systemRole = 'CONSEJERO',
  name = '🧘 Consejero/a',
  updatedAt = NOW()
WHERE discordRoleId = '1431388062449139719';

-- 4. Contacto
UPDATE discord_role_mappings 
SET 
  systemRole = 'CONTACTO',
  name = '📞 Contacto',
  updatedAt = NOW()
WHERE discordRoleId = '1431388062449139714';

-- 5. Formación
UPDATE discord_role_mappings 
SET 
  systemRole = 'FORMACION',
  name = '🎓 Formación',
  updatedAt = NOW()
WHERE discordRoleId = '1431388062449139717';

-- 6. Inteligencia
UPDATE discord_role_mappings 
SET 
  systemRole = 'INTELIGENCIA',
  name = '🧠 Inteligencia',
  updatedAt = NOW()
WHERE discordRoleId = '1431388062449139718';

-- 7. Logística (schon korrekt, aber sicherheitshalber)
UPDATE discord_role_mappings 
SET 
  systemRole = 'LOGISTICA',
  name = '📦 Logística',
  updatedAt = NOW()
WHERE discordRoleId = '1431388062474309700';

-- Verifikation
SELECT 
  SUBSTRING(id, 1, 20) as id_short,
  discordRoleId,
  systemRole,
  name,
  isActive
FROM discord_role_mappings 
WHERE discordRoleId IN (
  '1431388062449139715', -- Rutas
  '1431388062449139716', -- Sicario
  '1431388062449139719', -- Consejero
  '1431388062449139714', -- Contacto
  '1431388062449139717', -- Formación
  '1431388062449139718', -- Inteligencia
  '1431388062474309700'  -- Logística
)
ORDER BY name;

