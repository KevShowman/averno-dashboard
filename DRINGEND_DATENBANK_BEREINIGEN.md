# 🚨 DRINGEND: Datenbank-Bereinigung erforderlich

## Problem
Die Datenbank enthält noch alte Rollen-Mappings (`DON`, `ASESOR`), die nicht mehr im Prisma-Schema existieren.

**Fehler:** `Value '' not found in enum 'Role'`

## Schnelle Lösung (Wähle EINE Option)

### Option 1: NestJS Script (Empfohlen)

```bash
cd apps/api
npx tsx src/scripts/fix-old-role-mappings.ts
```

Dieses Script:
- ✅ Aktualisiert `DON` → `DON_CAPITAN`
- ✅ Aktualisiert `ASESOR` → `EL_MANO_DERECHA`
- ✅ Löscht ungültige/leere Mappings
- ✅ Aktualisiert User-Rollen
- ✅ Zeigt alle verbleibenden Mappings

### Option 2: Direktes SQL

Führen Sie `HOTFIX_DATABASE.sql` in Ihrer Datenbank aus:

```bash
# MySQL
mysql -u username -p database_name < HOTFIX_DATABASE.sql

# Oder via Docker
docker exec -i mysql-container mysql -u username -p database_name < HOTFIX_DATABASE.sql
```

### Option 3: Seed neu ausführen

Wenn Sie einen sauberen Neustart wollen:

```bash
cd apps/api

# 1. Lösche alle alten Mappings
npx prisma db execute --stdin <<SQL
DELETE FROM discord_role_mappings;
SQL

# 2. Seed ausführen (erstellt neue Mappings)
npm run prisma:seed
```

## Nach der Bereinigung

1. **Container neu starten:**
   ```bash
   docker-compose down
   docker-compose up -d
   ```

2. **Oder nur API neu starten:**
   ```bash
   docker-compose restart api
   ```

3. **Logs prüfen:**
   ```bash
   docker-compose logs -f api
   ```

4. **User neu einloggen lassen**
   - Alle User müssen sich neu einloggen
   - Dabei werden ihre Rollen automatisch neu synchronisiert

## Verifizierung

Prüfen Sie die Mappings in der Datenbank:

```sql
SELECT id, name, systemRole, isActive 
FROM discord_role_mappings 
ORDER BY systemRole;
```

Sollte **keine** `DON` oder `ASESOR` mehr enthalten!

## Erwartete Mappings

Nach der Bereinigung sollten Sie folgende Mappings haben:

- ✅ `EL_PATRON` (👑 - El Patrón)
- ✅ `DON_CAPITAN` (⚔️ - Don - El Capitán)
- ✅ `DON_COMANDANTE` (🛡️ - Don - El Comandante)
- ✅ `EL_MANO_DERECHA` (🤝 - El Mano Derecha)
- ✅ `EL_CUSTODIO` bis `EL_NOVATO` (Ränge 1-9)
- ✅ Legacy-Rollen (SICARIO, ROUTENVERWALTUNG, LOGISTICA, FUTURO)

## Wenn das Problem weiterhin besteht

Prüfen Sie die `users` Tabelle:

```sql
SELECT id, username, role 
FROM users 
WHERE role NOT IN (
  'ADMIN', 'QUARTIERMEISTER', 'MITGLIED', 'GAST',
  'EL_PATRON', 'DON_CAPITAN', 'DON_COMANDANTE', 'EL_MANO_DERECHA',
  'EL_CUSTODIO', 'EL_MENTOR', 'EL_ENCARGADO', 'EL_TENIENTE',
  'SOLDADO', 'EL_PREFECTO', 'EL_CONFIDENTE', 'EL_PROTECTOR', 'EL_NOVATO',
  'ROUTENVERWALTUNG', 'LOGISTICA', 'SICARIO', 'FUTURO'
);
```

Wenn User mit ungültigen Rollen gefunden werden:

```sql
-- Setze auf Standard-Rolle
UPDATE users 
SET role = 'SOLDADO' 
WHERE role NOT IN (...liste der gültigen Rollen...);
```

