-- Fix fehlende systemRole-Werte für Funktionsrollen (mit ID)

UPDATE discord_role_mappings 
SET systemRole = 'RUTAS'
WHERE id = '9d1ea738-c1b7-11f0-9987-7ced8d26715c';

UPDATE discord_role_mappings 
SET systemRole = 'CONSEJERO'
WHERE id = 'clz-consejero-mapping';

UPDATE discord_role_mappings 
SET systemRole = 'CONTACTO'
WHERE id = 'clz-contacto-mapping';

UPDATE discord_role_mappings 
SET systemRole = 'FORMACION'
WHERE id = 'clz-formacion-mapping';

UPDATE discord_role_mappings 
SET systemRole = 'INTELIGENCIA'
WHERE id = 'clz-inteligencia-mapping';

-- Verification: Zeige alle Funktionsrollen
SELECT id, discordRoleId, systemRole, name 
FROM discord_role_mappings 
WHERE systemRole IN ('RUTAS', 'CONSEJERO', 'CONTACTO', 'FORMACION', 'INTELIGENCIA', 'LOGISTICA', 'SICARIO')
   OR id LIKE 'clz-%'
   OR discordRoleId IN ('1431388062449139715', '1431388062449139719', '1431388062449139714', 
                        '1431388062449139717', '1431388062449139718', '1431388062474309700', 
                        '1431388062449139716');

