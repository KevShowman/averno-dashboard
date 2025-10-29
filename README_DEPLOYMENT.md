# LaSanta Calavera - Deployment Übersicht

## 📚 Dokumentation

Dieses Projekt enthält mehrere Dokumentationsdateien für verschiedene Zwecke:

### 🚀 Haupt-Deployment-Anleitung
- **`PLESK_DEPLOYMENT.md`** - Vollständige Schritt-für-Schritt-Anleitung für Plesk
  - Datenbank-Setup (MySQL/MariaDB)
  - Umgebungsvariablen
  - Docker-Konfiguration
  - Reverse Proxy Setup
  - SSL/HTTPS
  - Troubleshooting

### 🗄️ Datenbank-Spezifisch
- **`MYSQL_MIGRATION_GUIDE.md`** - MySQL/MariaDB Setup und Migration
  - Schema-Änderungen
  - Array → JSON Konvertierung
  - Migrationen
  - Rechte-Management
  - Troubleshooting

- **`PLESK_POSTGRESQL_SETUP.md`** - ⚠️ VERALTET (PostgreSQL)
  - Nur noch für historische Referenz
  - Die Anwendung verwendet jetzt MySQL/MariaDB

### 🌐 Reverse Proxy
- **`PLESK_REVERSE_PROXY.md`** - Nginx Reverse Proxy Konfiguration
  - API & Frontend Routing
  - SSL/TLS Setup
  - WebSocket Support
  - Subdomain-Setup (optional)

### 📝 Konfiguration
- **`ENV_TEMPLATE.txt`** - Template für `.env` Datei
  - Datenbank-URL (MySQL)
  - JWT Secrets
  - Discord OAuth
  - Application URLs

## 🏗️ Technologie-Stack

### Backend (API)
- **Framework**: NestJS
- **Datenbank**: MySQL/MariaDB (Port 3306)
- **ORM**: Prisma
- **Auth**: Discord OAuth + JWT
- **Port**: 3000 (intern)

### Frontend (Web)
- **Framework**: React + Vite
- **UI**: TailwindCSS
- **State**: Zustand
- **Queries**: TanStack Query
- **Port**: 8080 (intern)

### Infrastruktur
- **Hosting**: Plesk
- **Container**: Docker Compose
- **Reverse Proxy**: Plesk Nginx
- **SSL**: Let's Encrypt
- **Datenbank**: Plesk MariaDB

## 📋 Schnellstart-Checkliste

- [ ] **Schritt 1**: MySQL/MariaDB Datenbank in Plesk erstellen
- [ ] **Schritt 2**: MariaDB für Docker konfigurieren (bind-address, Rechte)
- [ ] **Schritt 3**: `.env` Datei im Projekt-Root erstellen
- [ ] **Schritt 4**: JWT Secrets generieren
- [ ] **Schritt 5**: Discord OAuth konfigurieren
- [ ] **Schritt 6**: Datenbank-Migrationen ausführen
- [ ] **Schritt 7**: Docker Stack starten
- [ ] **Schritt 8**: Reverse Proxy in Plesk konfigurieren
- [ ] **Schritt 9**: SSL/HTTPS aktivieren
- [ ] **Schritt 10**: Website testen

## 🎯 Wichtige Befehle

### Datenbank-Migrationen
```bash
cd /var/www/vhosts/lsc-nc.de/crc-ws/apps/api
DATABASE_URL='mysql://lsc:PASSWORT@172.17.0.1:3306/lsc_website' \
  npx prisma migrate deploy
```

### Docker Container
```bash
# Container starten
docker compose -f docker-compose.prod.yml up -d

# Container stoppen
docker compose -f docker-compose.prod.yml down

# Logs ansehen
docker logs -f lasanta-api
docker logs -f lasanta-web

# Container neu bauen
docker compose -f docker-compose.prod.yml build --no-cache
```

### MariaDB
```bash
# Service neu starten
sudo systemctl restart mariadb

# Status prüfen
sudo systemctl status mariadb

# Rechte setzen
mysql -u root -p << 'SQL'
GRANT ALL PRIVILEGES ON lsc_website.* TO 'lsc'@'172.17.%' IDENTIFIED BY 'PASSWORT';
FLUSH PRIVILEGES;
SQL
```

## 🔧 Troubleshooting

### Container startet nicht
1. Prüfen Sie Logs: `docker logs lasanta-api`
2. Prüfen Sie `.env` Datei: `cat .env`
3. Prüfen Sie DB-Verbindung: `mysql -h 172.17.0.1 -u lsc -p lsc_website`

### Datenbank-Verbindungsfehler
1. MariaDB läuft: `sudo systemctl status mariadb`
2. bind-address korrekt: `sudo grep bind-address /etc/mysql/mariadb.conf.d/50-server.cnf`
3. Rechte gesetzt: `mysql -u root -p -e "SHOW GRANTS FOR 'lsc'@'%';"`

### 502 Bad Gateway
1. Container laufen: `docker ps`
2. Nginx-Konfiguration: Siehe `PLESK_REVERSE_PROXY.md`
3. Ports erreichbar: `curl http://localhost:3000/health`

## 📊 Port-Übersicht

| Service        | Interner Port | Externer Zugriff                          |
|----------------|---------------|-------------------------------------------|
| API (NestJS)   | 3000          | https://lsc-nc.de/api/ (via Proxy)       |
| Web (React)    | 8080          | https://lsc-nc.de/ (via Proxy)           |
| DB (MariaDB)   | 3306          | localhost (nur intern)                    |
| Plesk Nginx    | 80, 443       | Öffentlich                                |

## 🔐 Sicherheit

- ⚠️ **`.env` niemals committen!** (ist in `.gitignore`)
- ✅ Starke Passwörter verwenden
- ✅ JWT Secrets mit `openssl rand -base64 32` generieren
- ✅ SSL/HTTPS aktivieren
- ✅ Firewall-Regeln prüfen
- ✅ Regelmäßige Backups

## 📞 Support

Bei Problemen:
1. Prüfen Sie die Logs (Docker, MariaDB, Nginx)
2. Konsultieren Sie `PLESK_DEPLOYMENT.md`
3. Konsultieren Sie `MYSQL_MIGRATION_GUIDE.md`
4. Prüfen Sie die Troubleshooting-Sektionen

## 🎉 Nach erfolgreichem Deployment

- ✅ Website läuft unter https://lsc-nc.de
- ✅ API erreichbar unter https://lsc-nc.de/api/health
- ✅ Discord OAuth funktioniert
- ✅ Datenbank-Verbindung stabil
- ✅ SSL-Zertifikat aktiv

Viel Erfolg! 🚀

