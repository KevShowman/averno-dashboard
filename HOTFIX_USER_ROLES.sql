-- HOTFIX: Bereinige User mit leeren oder ungültigen Rollen
-- Führen Sie dieses SQL direkt in der Datenbank aus

-- 1. Zeige alle User mit ungültigen Rollen
SELECT id, username, role, icFirstName, icLastName
FROM users
WHERE role = '' OR role IS NULL OR role NOT IN (
  'ADMIN', 'QUARTIERMEISTER', 'MITGLIED', 'GAST',
  'EL_PATRON', 'DON_CAPITAN', 'DON_COMANDANTE', 'EL_MANO_DERECHA',
  'EL_CUSTODIO', 'EL_MENTOR', 'EL_ENCARGADO', 'EL_TENIENTE',
  'SOLDADO', 'EL_PREFECTO', 'EL_CONFIDENTE', 'EL_PROTECTOR', 'EL_NOVATO',
  'ROUTENVERWALTUNG', 'LOGISTICA', 'SICARIO', 'FUTURO'
);

-- 2. Setze leere Rollen auf SOLDADO (Standard-Rolle)
UPDATE users 
SET role = 'SOLDADO' 
WHERE role = '' OR role IS NULL;

-- 3. Aktualisiere verbleibende ungültige Rollen
UPDATE users 
SET role = 'SOLDADO' 
WHERE role NOT IN (
  'ADMIN', 'QUARTIERMEISTER', 'MITGLIED', 'GAST',
  'EL_PATRON', 'DON_CAPITAN', 'DON_COMANDANTE', 'EL_MANO_DERECHA',
  'EL_CUSTODIO', 'EL_MENTOR', 'EL_ENCARGADO', 'EL_TENIENTE',
  'SOLDADO', 'EL_PREFECTO', 'EL_CONFIDENTE', 'EL_PROTECTOR', 'EL_NOVATO',
  'ROUTENVERWALTUNG', 'LOGISTICA', 'SICARIO', 'FUTURO'
);

-- 4. Verifizierung: Zeige alle User-Rollen
SELECT role, COUNT(*) as count 
FROM users 
GROUP BY role 
ORDER BY count DESC;

