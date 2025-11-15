-- Alternative: Lösche alle Sessions, damit User sich neu einloggen müssen
-- Das aktualisiert automatisch ihre Discord-Rollen

-- WARNUNG: Dies loggt ALLE User aus!

-- Sessions löschen (falls du eine Session-Tabelle hast)
-- DELETE FROM sessions;

-- Oder: Setze ein Flag, das beim nächsten Login die Rollen neu abruft
-- UPDATE users SET forceRoleRefresh = 1;

-- Zeige aktuelle User mit veralteten Discord-Rollen
SELECT 
  id,
  username,
  role,
  discordId,
  discordRoles,
  lastLogin
FROM users
WHERE username IN ('LSC | Tim J.', 'LSC | Leano Roberto', 'Ricarda')
ORDER BY lastLogin DESC;

-- Prüfe welche Discord-Rollen aktuell in der DB gespeichert sind

