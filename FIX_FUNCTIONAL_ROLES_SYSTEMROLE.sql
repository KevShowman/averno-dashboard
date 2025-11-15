-- Fix fehlende systemRole-Werte für Funktionsrollen

UPDATE discord_role_mappings 
SET systemRole = 'RUTAS', name = '🚛 Rutas'
WHERE discordRoleId = '1431388062449139715';

UPDATE discord_role_mappings 
SET systemRole = 'SICARIO', name = '🔫 Sicario'
WHERE discordRoleId = '1431388062449139716';

UPDATE discord_role_mappings 
SET systemRole = 'CONSEJERO', name = '🧘 Consejero/a'
WHERE discordRoleId = '1431388062449139719';

UPDATE discord_role_mappings 
SET systemRole = 'CONTACTO', name = '📞 Contacto'
WHERE discordRoleId = '1431388062449139714';

UPDATE discord_role_mappings 
SET systemRole = 'FORMACION', name = '🎓 Formación'
WHERE discordRoleId = '1431388062449139717';

UPDATE discord_role_mappings 
SET systemRole = 'INTELIGENCIA', name = '🧠 Inteligencia'
WHERE discordRoleId = '1431388062449139718';

UPDATE discord_role_mappings 
SET systemRole = 'LOGISTICA', name = '📦 Logística'
WHERE discordRoleId = '1431388062474309700';

SELECT 'Funktionsrollen korrigiert!' as status;

