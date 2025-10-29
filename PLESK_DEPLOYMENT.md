# Plesk Deployment Anleitung

Diese Anleitung beschreibt das Deployment der LaSanta Website auf Plesk mit externer Datenbank.

## 1. Datenbank in Plesk einrichten

### PostgreSQL Datenbank erstellen
1. In Plesk: **Datenbanken** → **Datenbank hinzufügen**
2. Wählen Sie **PostgreSQL**
3. Datenbank-Details:
   - **Datenbankname**: `lasanta_db` (oder eigener Name)
   - **Benutzer**: `lasanta_user` (oder eigener Name)
   - **Passwort**: Sicheres Passwort generieren
   - **Host**: `localhost` (Standard)
   - **Port**: `5432` (Standard)

**Notieren Sie sich alle Zugangsdaten!**

## 2. Umgebungsvariablen konfigurieren

Erstellen Sie eine `.env` Datei im Projekt-Root mit folgendem Inhalt:

```bash
# ==============================================
# DATABASE (Plesk PostgreSQL)
# ==============================================
DATABASE_URL=postgresql://lasanta_user:IHR_PASSWORT@localhost:5432/lasanta_db?schema=public

# ==============================================
# JWT SECRETS
# ==============================================
# Generieren Sie neue Secrets mit: openssl rand -base64 32
JWT_SECRET=IHR_JWT_SECRET
JWT_REFRESH_SECRET=IHR_JWT_REFRESH_SECRET

# ==============================================
# DISCORD OAUTH
# ==============================================
DISCORD_CLIENT_ID=IHR_DISCORD_CLIENT_ID
DISCORD_CLIENT_SECRET=IHR_DISCORD_CLIENT_SECRET
DISCORD_BOT_TOKEN=IHR_DISCORD_BOT_TOKEN
DISCORD_GUILD_ID=IHR_DISCORD_GUILD_ID

# ==============================================
# PRODUCTION URLS
# ==============================================
FRONTEND_URL=https://lsc-nc.de
API_BASE_URL=https://lsc-nc.de
DISCORD_REDIRECT_URI=https://lsc-nc.de/api/auth/discord/callback

# ==============================================
# ENVIRONMENT
# ==============================================
NODE_ENV=production
```

### Sichere Secrets generieren

```bash
# JWT Secret generieren
openssl rand -base64 32

# JWT Refresh Secret generieren
openssl rand -base64 32
```

## 3. Datenbank initialisieren

Vor dem ersten Start müssen Sie die Datenbank-Migrationen ausführen:

```bash
# SSH in Ihren Plesk Server
cd /var/www/vhosts/lsc-nc.de/crc-ws/apps/api

# Prisma Migrationen ausführen (einmalig)
npx prisma migrate deploy

# Optional: Prisma Client neu generieren
npx prisma generate
```

Alternativ können Sie die Migrationen auch im API-Container ausführen:

```bash
# Container starten
docker compose -f docker-compose.prod.yml up -d api

# In den Container wechseln
docker exec -it lasanta-api sh

# Migrationen ausführen
pnpm prisma migrate deploy

# Container verlassen
exit
```

## 4. Docker Stack in Plesk starten

1. In Plesk: **Docker** → **Add Stack**
2. **Stack Name**: `lsc-website`
3. **Compose File**: Wählen Sie `docker-compose.prod.yml`
4. Klicken Sie auf **Run**

## 5. Überprüfung

### Container-Status prüfen
```bash
docker ps
```

Folgende Container sollten laufen:
- `lasanta-api` (NestJS Backend)
- `lasanta-web` (React Frontend)
- `lasanta-nginx` (Reverse Proxy)

### Logs überprüfen
```bash
# API Logs
docker logs lasanta-api

# Web Logs
docker logs lasanta-web

# Nginx Logs
docker logs lasanta-nginx
```

### Datenbank-Verbindung testen
```bash
# Im API Container
docker exec -it lasanta-api sh

# Test-Query
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.\$connect().then(() => console.log('DB Connected!')).catch(console.error)"
```

## 6. Troubleshooting

### Problem: Datenbank-Verbindung schlägt fehl

**Symptom**: API Container startet nicht oder zeigt Verbindungsfehler

**Lösungen**:
1. Überprüfen Sie die `DATABASE_URL` in der `.env` Datei
2. Stellen Sie sicher, dass PostgreSQL in Plesk läuft
3. Prüfen Sie, ob der Container Zugriff auf `localhost` hat:
   - Nutzen Sie ggf. `host.docker.internal` statt `localhost`
   - Oder verwenden Sie die Server-IP-Adresse

```bash
# Alternative DATABASE_URL für Docker
DATABASE_URL=postgresql://lasanta_user:PASSWORT@host.docker.internal:5432/lasanta_db?schema=public
```

### Problem: Migrationen schlagen fehl

**Lösung**: Führen Sie die Migrationen manuell aus:
```bash
cd /var/www/vhosts/lsc-nc.de/crc-ws/apps/api
DATABASE_URL="postgresql://lasanta_user:PASSWORT@localhost:5432/lasanta_db?schema=public" npx prisma migrate deploy
```

### Problem: API ist nicht erreichbar

**Lösungen**:
1. Überprüfen Sie die Nginx-Konfiguration
2. Stellen Sie sicher, dass Port 80/443 in Plesk freigegeben ist
3. Überprüfen Sie die Firewall-Einstellungen

## 7. Backup & Wartung

### Datenbank-Backup erstellen
```bash
# Über Plesk Backup-Funktion
# oder manuell:
pg_dump -U lasanta_user -h localhost lasanta_db > backup_$(date +%Y%m%d).sql
```

### Stack aktualisieren
```bash
cd /var/www/vhosts/lsc-nc.de/crc-ws
git pull
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build
```

### Logs rotieren
Die Logs werden automatisch in den Volumes gespeichert:
- `api_logs`: API Logs
- `api_uploads`: Hochgeladene Dateien

## 8. Wichtige Hinweise

⚠️ **Sicherheit**:
- Verwenden Sie **starke Passwörter** für die Datenbank
- **Committen Sie niemals** die `.env` Datei ins Git-Repository
- Aktivieren Sie SSL/HTTPS für die Produktion
- Halten Sie Docker und alle Images aktuell

📊 **Performance**:
- PostgreSQL-Verbindungen sind limitiert - konfigurieren Sie Connection Pooling bei Bedarf
- Überwachen Sie die Datenbank-Größe regelmäßig
- Nutzen Sie Plesk's Monitoring-Tools

## 9. Kontakt & Support

Bei Problemen:
1. Überprüfen Sie die Container-Logs
2. Testen Sie die Datenbank-Verbindung
3. Kontaktieren Sie den Plesk-Support bei Server-Problemen

