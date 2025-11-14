-- Diese Rolle haben ALLE Member - sie sollte nicht gemappt sein!
-- Deaktiviere oder lösche die "LaSanta Calavera" Base-Member-Rolle

-- Option 1: Deaktivieren (empfohlen)
UPDATE discord_role_mappings 
SET isActive = 0, updatedAt = NOW()
WHERE discordRoleId = '1431388062427906220' AND name LIKE '%Soldado%';

-- Option 2: Komplett löschen (falls du sicher bist)
-- DELETE FROM discord_role_mappings WHERE discordRoleId = '1431388062427906220';

-- Zeige was übrig bleibt
SELECT discordRoleId, systemRole, name, isActive FROM discord_role_mappings 
WHERE isActive = 1
ORDER BY systemRole;

