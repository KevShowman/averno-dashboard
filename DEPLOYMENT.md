# LaSanta Calavera VM Deployment Guide

## 🚀 Schnellstart

1. **Repository klonen:**
   ```bash
   git clone <repository-url>
   cd crc-ws
   ```

2. **Docker Compose V2 prüfen:**
   ```bash
   docker compose version
   # Sollte Version 2.0+ anzeigen
   ```

3. **Deployment-Script ausführen:**
   ```bash
   chmod +x scripts/*.sh
   ./scripts/deploy-to-vm.sh
   ```

4. **Umgebungsvariablen konfigurieren:**
   - Bearbeite `.env` mit deinen Werten
   - Führe erneut aus: `./scripts/deploy-to-vm.sh --continue`

## 📋 Voraussetzungen

- Docker & Docker Compose V2 (mindestens Version 2.0)
- Mindestens 2GB RAM
- 10GB freier Speicherplatz
- Port 80, 443, 3000, 5432 verfügbar

## 🔧 Konfiguration

### Umgebungsvariablen (.env)

```bash
# Database
POSTGRES_PASSWORD="your-secure-password"

# JWT Secrets (mindestens 32 Zeichen!)
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-min-32-chars"

# Discord
DISCORD_CLIENT_ID="your_discord_client_id"
DISCORD_CLIENT_SECRET="your_discord_client_secret"
DISCORD_BOT_TOKEN="your_discord_bot_token"
DISCORD_GUILD_ID="your_discord_server_id"

# URLs
FRONTEND_URL="https://your-domain.com"
API_BASE_URL="https://your-domain.com"
```

### Discord Bot Setup

1. **Bot erstellen:**
   - Gehe zu [Discord Developer Portal](https://discord.com/developers/applications)
   - Erstelle neue Application
   - Gehe zu "Bot" → Erstelle Bot
   - Kopiere Bot Token

2. **Bot Berechtigungen:**
   - Server Members Intent aktivieren
   - Bot zum Server einladen mit Berechtigungen:
     - Read Messages
     - Send Messages
     - Manage Roles (optional)

3. **Server-ID finden:**
   - Discord → Einstellungen → Erweitert → Entwicklermodus
   - Rechtsklick auf Server → "ID kopieren"

## 🗄️ Datenpersistenz

### Volumes
- `postgres_data`: PostgreSQL Datenbank
- `api_uploads`: API Upload-Dateien
- `api_logs`: API Log-Dateien

### Backups

**Automatisches Backup:**
```bash
./scripts/backup-database.sh
```

**Backup wiederherstellen:**
```bash
./scripts/restore-database.sh backups/lasanta_backup_YYYYMMDD_HHMMSS.sql
```

**Volume-Verwaltung:**
```bash
./scripts/manage-volumes.sh list    # Volumes anzeigen
./scripts/manage-volumes.sh info    # Volume-Info
./scripts/manage-volumes.sh backup  # Volume-Backup
```

## 🔒 Sicherheit

### Firewall (UFW)
```bash
sudo ufw allow 22      # SSH
sudo ufw allow 80      # HTTP
sudo ufw allow 443     # HTTPS
sudo ufw enable
```

### SSL/TLS
1. **Let's Encrypt:**
   ```bash
   sudo apt install certbot
   sudo certbot certonly --standalone -d your-domain.com
   ```

2. **Nginx SSL-Konfiguration hinzufügen**

### Backup-Strategie
- **Täglich:** Automatisches DB-Backup
- **Wöchentlich:** Volume-Backup
- **Monatlich:** Vollständiges System-Backup

## 📊 Monitoring

### Logs anzeigen
```bash
# Alle Services
docker compose -f docker compose.prod.yml logs -f

# Einzelner Service
docker compose -f docker compose.prod.yml logs -f api
docker compose -f docker compose.prod.yml logs -f web
docker compose -f docker compose.prod.yml logs -f db
```

### Status prüfen
```bash
docker compose -f docker compose.prod.yml ps
```

### Ressourcenverbrauch
```bash
docker stats
```

## 🔄 Updates

### Anwendung aktualisieren
```bash
git pull
docker compose -f docker compose.prod.yml build
docker compose -f docker compose.prod.yml up -d
```

### Datenbank-Migration
```bash
docker compose exec api pnpm exec prisma migrate deploy
```

## 🆘 Troubleshooting

### Container startet nicht
```bash
docker compose -f docker compose.prod.yml logs [service-name]
```

### Datenbank-Verbindung
```bash
docker compose exec db psql -U lasanta -d lasanta_db
```

### Volumes zurücksetzen
```bash
./scripts/manage-volumes.sh reset  # ⚠️ LÖSCHT ALLE DATEN!
```

### Vollständiger Neustart
```bash
docker compose -f docker compose.prod.yml down
docker compose -f docker compose.prod.yml up -d
```

## 📞 Support

Bei Problemen:
1. Logs prüfen
2. Status der Services überprüfen
3. Volume-Informationen anzeigen
4. Backup vor Änderungen erstellen

## 🔧 Wartung

### Regelmäßige Tasks
- **Täglich:** Logs prüfen
- **Wöchentlich:** Backup-Test
- **Monatlich:** System-Updates
- **Quartalsweise:** Sicherheits-Updates

### Performance-Optimierung
- Datenbank-Indizes prüfen
- Log-Rotation einrichten
- Monitoring-Tools installieren
