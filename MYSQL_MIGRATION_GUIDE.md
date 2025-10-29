# MySQL/MariaDB Migration Anleitung

## ✅ Durchgeführte Änderungen

### 1. Prisma Schema (`apps/api/prisma/schema.prisma`)
- ✅ Provider von `postgresql` → `mysql` geändert
- ✅ Array-Felder zu JSON konvertiert (MySQL unterstützt keine nativen Arrays):
  - `allRoles Role[]` → `allRoles Json`
  - `discordRoles String[]` → `discordRoles Json`
  - `tags String[]` → `tags Json`

### 2. .env Datei
- ✅ Im Projekt-Root erstellt
- ⚠️ **WICHTIG**: Sie müssen noch die Platzhalter ausfüllen!

## 🚀 Nächste Schritte

### Schritt 1: .env Datei vervollständigen

```bash
cd /var/www/vhosts/lsc-nc.de/crc-ws

# JWT Secrets generieren
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env.tmp
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 32)" >> .env.tmp

# Dann manuell bearbeiten und Discord-Daten einfügen
nano .env
```

Ersetzen Sie:
- `YOUR_DISCORD_CLIENT_ID`
- `YOUR_DISCORD_CLIENT_SECRET`
- `YOUR_DISCORD_BOT_TOKEN`
- `YOUR_DISCORD_GUILD_ID`

### Schritt 2: MariaDB für Docker-Zugriff konfigurieren

```bash
# MariaDB bind-address ändern
sudo nano /etc/mysql/mariadb.conf.d/50-server.cnf

# Ändern Sie:
# bind-address = 127.0.0.1
# zu:
# bind-address = 0.0.0.0

# Speichern und neu starten
sudo systemctl restart mariadb
```

### Schritt 3: MariaDB Benutzer-Rechte setzen

```bash
mysql -u root -p << 'SQL'
-- Rechte für alle Docker-Netzwerke
GRANT ALL PRIVILEGES ON lsc_website.* TO 'lsc'@'%' IDENTIFIED BY 'DePa645246!';
GRANT ALL PRIVILEGES ON lsc_website.* TO 'lsc'@'localhost' IDENTIFIED BY 'DePa645246!';
GRANT ALL PRIVILEGES ON lsc_website.* TO 'lsc'@'172.16.%' IDENTIFIED BY 'DePa645246!';
GRANT ALL PRIVILEGES ON lsc_website.* TO 'lsc'@'172.17.%' IDENTIFIED BY 'DePa645246!';
FLUSH PRIVILEGES;

-- Prüfen
SHOW GRANTS FOR 'lsc'@'%';
EXIT;
SQL
```

### Schritt 4: Alte PostgreSQL-Migrationen löschen

```bash
cd /var/www/vhosts/lsc-nc.de/crc-ws/apps/api

# Backup erstellen
cp -r prisma/migrations prisma/migrations.postgres.backup

# Alte Migrationen löschen
rm -rf prisma/migrations/*
```

### Schritt 5: Neue MySQL-Migrationen erstellen

```bash
cd /var/www/vhosts/lsc-nc.de/crc-ws/apps/api

# Prisma Client neu generieren
npx prisma generate

# Neue Migration erstellen und deployen
DATABASE_URL='mysql://lsc:DePa645246!@172.17.0.1:3306/lsc_website' \
  npx prisma migrate dev --name init_mysql

# Oder nur deployen (für Produktion):
DATABASE_URL='mysql://lsc:DePa645246!@172.17.0.1:3306/lsc_website' \
  npx prisma migrate deploy
```

### Schritt 6: Container neu bauen

```bash
cd /var/www/vhosts/lsc-nc.de/crc-ws

# Container stoppen
docker compose -f docker-compose.prod.yml down

# API neu bauen (wichtig: Schema hat sich geändert!)
docker compose -f docker-compose.prod.yml build --no-cache api

# Alle Container starten
docker compose -f docker-compose.prod.yml up -d

# Logs verfolgen
docker logs -f lasanta-api
```

### Schritt 7: Überprüfung

```bash
# Container-Status
docker ps | grep lasanta

# API-Logs
docker logs lasanta-api --tail 50

# Verbindung testen
curl http://localhost:3000/health
```

## ⚠️ Wichtige Änderungen im Code

### Array-Felder sind jetzt JSON

Im TypeScript-Code müssen Sie Array-Felder als JSON behandeln:

**Vorher (PostgreSQL):**
```typescript
user.discordRoles // string[]
user.allRoles     // Role[]
item.tags         // string[]
```

**Nachher (MySQL):**
```typescript
user.discordRoles as string[] // JSON wird automatisch geparst
user.allRoles as Role[]       // JSON wird automatisch geparst
item.tags as string[]         // JSON wird automatisch geparst
```

Prisma konvertiert JSON automatisch, aber TypeScript-Typen müssen evtl. angepasst werden.

## 🔧 Troubleshooting

### Problem: "Unknown database 'lsc_website'"

```bash
# Datenbank erstellen
mysql -u root -p -e "CREATE DATABASE lsc_website CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### Problem: "Access denied for user 'lsc'"

```bash
# Rechte nochmal setzen
mysql -u root -p << 'SQL'
GRANT ALL PRIVILEGES ON lsc_website.* TO 'lsc'@'%' IDENTIFIED BY 'DePa645246!';
FLUSH PRIVILEGES;
SQL
```

### Problem: Container kann DB nicht erreichen

```bash
# bind-address prüfen
sudo grep bind-address /etc/mysql/mariadb.conf.d/50-server.cnf

# Sollte sein: bind-address = 0.0.0.0
# Falls nicht, ändern und neu starten:
sudo systemctl restart mariadb
```

### Problem: Migration schlägt fehl

```bash
# Prisma Client neu generieren
cd /var/www/vhosts/lsc-nc.de/crc-ws/apps/api
npx prisma generate

# Schema validieren
npx prisma validate

# Migration mit Shadow DB
DATABASE_URL='mysql://lsc:DePa645246!@172.17.0.1:3306/lsc_website' \
  npx prisma migrate dev --create-only --name init_mysql
```

## 📊 Vergleich: PostgreSQL vs MySQL

| Feature | PostgreSQL | MySQL/MariaDB |
|---------|-----------|---------------|
| Arrays | Nativ unterstützt | Als JSON |
| Performance | Sehr gut | Sehr gut |
| Plesk-Integration | Manuell | Nativ |
| Berechtigungen | Kompliziert | Einfacher |
| Docker-Kompatibilität | Erfordert Config | Einfacher |

## ✅ Checkliste

- [ ] .env Datei vervollständigt (Discord-Daten)
- [ ] MariaDB bind-address auf 0.0.0.0 gesetzt
- [ ] MariaDB Benutzer-Rechte gesetzt
- [ ] Alte Migrationen gelöscht
- [ ] Neue MySQL-Migrationen erstellt
- [ ] Container neu gebaut
- [ ] Container laufen erfolgreich
- [ ] API Health-Check funktioniert
- [ ] Reverse Proxy konfiguriert
- [ ] SSL aktiviert
- [ ] Website funktioniert

Viel Erfolg! 🚀

