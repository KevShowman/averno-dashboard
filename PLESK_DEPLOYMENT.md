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

**Wichtig**: Die Container laufen auf internen Ports:
- API: Port 3000 (intern)
- Web: Port 8080 (intern)

Diese sind NICHT direkt von außen erreichbar. Sie müssen im nächsten Schritt den Reverse Proxy konfigurieren.

## 5. Plesk Reverse Proxy konfigurieren

Da Plesk bereits einen Webserver auf Port 80/443 betreibt, müssen Sie Plesk als Reverse Proxy einrichten.

### Nginx Direktiven hinzufügen

1. Gehen Sie zu **Websites & Domains** → Ihre Domain
2. Klicken Sie auf **Apache & nginx Settings**
3. Fügen Sie im Bereich **"Additional nginx directives"** hinzu:

```nginx
# API Backend Proxy
location /api/ {
    proxy_pass http://localhost:3000/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    proxy_read_timeout 300s;
    proxy_connect_timeout 75s;
}

# Frontend Proxy (Root)
location / {
    proxy_pass http://localhost:8080/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

4. Klicken Sie auf **OK** oder **Apply**

Siehe auch: `PLESK_REVERSE_PROXY.md` für detaillierte Anweisungen

## 6. SSL/HTTPS aktivieren

1. In Plesk: **SSL/TLS Certificates**
2. Wählen Sie **Let's Encrypt**
3. Aktivieren Sie das Zertifikat für Ihre Domain
4. Aktivieren Sie **"Permanent SEO-safe 301 redirect from HTTP to HTTPS"**

## 7. Überprüfung

### Container-Status prüfen
```bash
docker ps
```

Folgende Container sollten laufen:
- `lasanta-api` (NestJS Backend) - Port 3000 intern
- `lasanta-web` (React Frontend) - Port 8080 intern

**Hinweis**: Es gibt KEINEN `lasanta-nginx` Container - Plesk fungiert als Reverse Proxy!

### Logs überprüfen
```bash
# API Logs
docker logs lasanta-api

# Web Logs
docker logs lasanta-web

# Plesk Nginx Logs (Host-System)
tail -f /var/log/nginx/error.log
tail -f /var/www/vhosts/lsc-nc.de/logs/error_log
```

### Datenbank-Verbindung testen
```bash
# Im API Container
docker exec -it lasanta-api sh

# Test-Query
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.\$connect().then(() => console.log('DB Connected!')).catch(console.error)"
```

### Webseite testen
```bash
# API Health Check
curl https://lsc-nc.de/api/health

# Frontend
# Öffnen Sie https://lsc-nc.de im Browser
```

## 8. Troubleshooting

### Problem: Port 80/443 bereits belegt

**Symptom**: `Error: bind: address already in use`

**Lösung**: 
- Dies ist normal auf Plesk! Die Container laufen auf internen Ports (3000, 8080)
- Konfigurieren Sie den Reverse Proxy wie in Schritt 5 beschrieben
- Siehe auch: `PLESK_REVERSE_PROXY.md`

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

### Problem: 502 Bad Gateway

**Symptom**: Webseite zeigt 502-Fehler

**Lösungen**:
1. Prüfen Sie, ob Container laufen: `docker ps`
2. Prüfen Sie Container-Logs: `docker logs lasanta-api` und `docker logs lasanta-web`
3. Testen Sie direkt: `curl http://localhost:3000/health` und `curl http://localhost:8080`
4. Überprüfen Sie die Nginx-Proxy-Konfiguration in Plesk

### Problem: CORS-Fehler im Browser

**Symptom**: Console zeigt CORS-Policy-Fehler

**Lösung**: Prüfen Sie die `.env` Datei:
```bash
FRONTEND_URL=https://lsc-nc.de  # Muss mit der tatsächlichen Domain übereinstimmen!
API_BASE_URL=https://lsc-nc.de
```

## 9. Backup & Wartung

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

## 10. Wichtige Hinweise

⚠️ **Sicherheit**:
- Verwenden Sie **starke Passwörter** für die Datenbank
- **Committen Sie niemals** die `.env` Datei ins Git-Repository
- Aktivieren Sie SSL/HTTPS für die Produktion
- Halten Sie Docker und alle Images aktuell

📊 **Performance**:
- PostgreSQL-Verbindungen sind limitiert - konfigurieren Sie Connection Pooling bei Bedarf
- Überwachen Sie die Datenbank-Größe regelmäßig
- Nutzen Sie Plesk's Monitoring-Tools

## 11. Port-Übersicht

| Service | Interner Port | Externer Zugriff |
|---------|--------------|------------------|
| API     | 3000         | https://lsc-nc.de/api/ (via Plesk Proxy) |
| Web     | 8080         | https://lsc-nc.de/ (via Plesk Proxy) |
| DB      | 5432         | localhost (Plesk DB, nicht im Container) |

## 12. Kontakt & Support

Bei Problemen:
1. Überprüfen Sie die Container-Logs
2. Testen Sie die Datenbank-Verbindung
3. Kontaktieren Sie den Plesk-Support bei Server-Problemen

