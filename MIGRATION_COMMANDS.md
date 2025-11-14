# Migrations-Kommandos für Rang- und Kleidungssystem

## Schritt-für-Schritt Anleitung

### 1. Prisma Client neu generieren

```bash
cd apps/api
npx prisma generate
```

### 2. Migration erstellen und ausführen

```bash
cd apps/api
npx prisma migrate dev --name add_new_ranks_and_clothing_system
```

**Hinweis:** Dieser Befehl erstellt eine neue Migration basierend auf den Änderungen im `schema.prisma` und wendet sie auf die Datenbank an.

### 3. Seed ausführen (Discord-Role-Mappings)

```bash
cd apps/api
npm run prisma:seed
```

oder direkt:

```bash
cd apps/api
npx tsx src/prisma/seed.ts
```

### 4. Production Deployment

Für Production sollten die Migrationen separat ausgeführt werden:

```bash
cd apps/api

# 1. Prisma Client generieren
npx prisma generate

# 2. Migrationen ausführen (ohne Seed)
npx prisma migrate deploy

# 3. Optional: Seed manuell ausführen
npm run prisma:seed
```

## Rollback (falls erforderlich)

Falls die Migration rückgängig gemacht werden muss:

```bash
cd apps/api

# Zeige alle Migrationen
npx prisma migrate status

# Rollback zur vorherigen Migration (VORSICHT!)
# Dies ist in Prisma nicht direkt möglich, daher:
# 1. Backup der Datenbank erstellen
# 2. Manuelle SQL-Befehle zum Löschen der neuen Tabellen

# Neue Tabellen löschen:
DROP TABLE IF EXISTS user_clothing;
DROP TABLE IF EXISTS rank_clothing_templates;

# Alte Role-Enum wiederherstellen (kompliziert)
# Empfehlung: Backup wiederherstellen
```

## Verifizierung

### 1. Prüfe ob neue Tabellen existieren

```sql
SHOW TABLES LIKE '%clothing%';
```

Erwartete Ausgabe:
- `rank_clothing_templates`
- `user_clothing`

### 2. Prüfe ob neue Rollen im Enum existieren

```sql
SHOW COLUMNS FROM users LIKE 'role';
```

### 3. Prüfe Discord-Role-Mappings

```sql
SELECT * FROM discord_role_mappings;
```

Erwartete Anzahl: Mindestens 13 neue Mappings

### 4. Prüfe ob API startet

```bash
cd apps/api
npm run start:dev
```

Erwartete Ausgabe:
```
✅ Database connected
✅ Clothing module loaded
🚀 Application is running on: http://localhost:3001
```

## Häufige Fehler

### Fehler: "Column 'role' cannot be null"

**Ursache:** User mit ungültiger Rolle

**Lösung:**
```sql
UPDATE users SET role = 'SOLDADO' WHERE role IS NULL;
```

### Fehler: "Unknown column 'maskItem'"

**Ursache:** Migration wurde nicht ausgeführt

**Lösung:**
```bash
cd apps/api
npx prisma migrate deploy
```

### Fehler: "Foreign key constraint fails"

**Ursache:** User-Daten referenzieren alte Rollen

**Lösung:**
```sql
-- Prüfe User mit Legacy-Rollen
SELECT id, username, role FROM users WHERE role IN ('ADMIN', 'QUARTIERMEISTER', 'MITGLIED', 'GAST');

-- Optional: Update zu neuen Rollen
UPDATE users SET role = 'EL_PATRON' WHERE role = 'ADMIN';
```

## Discord-Synchronisierung nach Migration

Nach erfolgreicher Migration sollten alle Discord-User neu synchronisiert werden:

### Manuell via API (empfohlen)

```bash
# 1. Als Admin einloggen und Token erhalten
# 2. API-Endpoint aufrufen

curl -X POST http://localhost:3001/discord/sync-members \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Automatisch via Scheduler

Der Scheduler synchronisiert automatisch alle 24 Stunden.

## Testing

### 1. API-Endpoints testen

```bash
# Kleidungs-Templates abrufen (als Leaderschaft)
curl http://localhost:3001/clothing/templates \
  -H "Authorization: Bearer YOUR_TOKEN"

# Eigene Kleidung abrufen
curl http://localhost:3001/clothing/my-clothing \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Seed-Daten prüfen

```sql
-- Prüfe Discord-Role-Mappings
SELECT 
  name, 
  systemRole, 
  isActive 
FROM discord_role_mappings 
WHERE isActive = 1;

-- Erwartete Anzahl: 13 neue Mappings
```

## Cleanup (optional)

Falls alte/ungenutzte Daten gelöscht werden sollen:

```sql
-- Lösche inaktive Discord-Role-Mappings
DELETE FROM discord_role_mappings WHERE isActive = 0;

-- Lösche User mit Legacy-Rollen (VORSICHT!)
-- DELETE FROM users WHERE role IN ('ADMIN', 'QUARTIERMEISTER', 'MITGLIED', 'GAST');
```

## Backup vor Migration (WICHTIG!)

**Erstelle immer ein Backup vor der Migration!**

```bash
# MySQL Backup
mysqldump -u username -p database_name > backup_before_ranks_migration.sql

# PostgreSQL Backup
pg_dump -U username database_name > backup_before_ranks_migration.sql
```

## Restore (falls erforderlich)

```bash
# MySQL Restore
mysql -u username -p database_name < backup_before_ranks_migration.sql

# PostgreSQL Restore
psql -U username database_name < backup_before_ranks_migration.sql
```

