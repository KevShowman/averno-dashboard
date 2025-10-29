# PostgreSQL Setup für Plesk

## Problem: MySQL/MariaDB vs PostgreSQL

Ihre Plesk-Datenbank läuft auf **Port 3306** → Das ist **MySQL/MariaDB**, aber die Anwendung benötigt **PostgreSQL**!

```
Port 3306 = MySQL/MariaDB ❌
Port 5432 = PostgreSQL ✅
```

## Lösung: PostgreSQL in Plesk einrichten

### Schritt 1: PostgreSQL prüfen/installieren

#### 1.1 Prüfen, ob PostgreSQL verfügbar ist

```bash
# Per SSH
psql --version
```

Wenn PostgreSQL nicht installiert ist:

```bash
# Für Debian/Ubuntu
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

# Für CentOS/RHEL
sudo yum install postgresql-server postgresql-contrib
sudo postgresql-setup initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### 1.2 Plesk PostgreSQL-Integration installieren

Falls Plesk PostgreSQL nicht anbietet:

```bash
# Plesk Installer verwenden
plesk installer add --components postgresql

# Oder über Plesk GUI:
# Tools & Settings → Updates → Add/Remove Components → PostgreSQL
```

### Schritt 2: PostgreSQL-Datenbank in Plesk erstellen

Nach der Installation:

1. **Datenbanken** → **Datenbank hinzufügen**
2. Wählen Sie **PostgreSQL** (nicht MySQL!)
3. Füllen Sie aus:
   - **Datenbankname**: `lsc_website`
   - **Benutzername**: `lsc`
   - **Passwort**: Sicheres Passwort generieren
   - **Host**: `localhost`
   - **Port**: `5432`

### Schritt 3: PostgreSQL für Docker-Zugriff konfigurieren

Docker-Container laufen in einem eigenen Netzwerk und können nicht direkt auf `localhost` zugreifen.

#### 3.1 PostgreSQL-Konfiguration bearbeiten

```bash
# Finden Sie die PostgreSQL-Version und Config-Datei
sudo -u postgres psql -c "SHOW config_file;"

# Meist hier:
# /etc/postgresql/15/main/postgresql.conf
# /var/lib/pgsql/data/postgresql.conf
```

Bearbeiten Sie `postgresql.conf`:

```bash
sudo nano /etc/postgresql/*/main/postgresql.conf
```

Stellen Sie sicher, dass PostgreSQL auf allen Interfaces lauscht:

```conf
# Ändern Sie:
listen_addresses = '*'
# oder
listen_addresses = '0.0.0.0'
```

#### 3.2 Client-Authentifizierung konfigurieren

Bearbeiten Sie `pg_hba.conf`:

```bash
sudo nano /etc/postgresql/*/main/pg_hba.conf
```

Fügen Sie am Ende hinzu:

```conf
# Docker Container Zugriff
# Format: TYPE  DATABASE  USER  ADDRESS  METHOD

# Lokale Verbindungen
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5

# Docker Bridge Netzwerk (Standard: 172.17.0.0/16)
host    all             all             172.17.0.0/16           md5

# Alle lokalen Netzwerke (weniger sicher, nur für Entwicklung)
# host    all             all             0.0.0.0/0               md5
```

#### 3.3 PostgreSQL neu starten

```bash
sudo systemctl restart postgresql

# Status prüfen
sudo systemctl status postgresql
```

#### 3.4 Verbindung testen

```bash
# Von außerhalb des Containers (auf dem Host)
psql -h localhost -U lsc -d lsc_website

# Vom Docker Container aus
docker run --rm -it postgres:15 psql -h 172.17.0.1 -U lsc -d lsc_website
```

### Schritt 4: DATABASE_URL konfigurieren

Erstellen oder aktualisieren Sie `.env` im Projekt-Root:

```bash
# Option 1: Über Docker Bridge IP (empfohlen)
DATABASE_URL=postgresql://lsc:IHR_PASSWORT@172.17.0.1:5432/lsc_website?schema=public

# Option 2: Über externe IP (wenn von außen erreichbar)
DATABASE_URL=postgresql://lsc:IHR_PASSWORT@135.116.64.230:5432/lsc_website?schema=public

# Option 3: host.docker.internal (manchmal funktioniert das)
DATABASE_URL=postgresql://lsc:IHR_PASSWORT@host.docker.internal:5432/lsc_website?schema=public
```

**Wichtig**: Ersetzen Sie `IHR_PASSWORT` mit dem echten Passwort!

### Schritt 5: Firewall-Regeln (falls nötig)

Wenn PostgreSQL von außen nicht erreichbar ist:

```bash
# UFW (Ubuntu)
sudo ufw allow 5432/tcp

# firewalld (CentOS/RHEL)
sudo firewall-cmd --permanent --add-port=5432/tcp
sudo firewall-cmd --reload

# iptables
sudo iptables -A INPUT -p tcp --dport 5432 -j ACCEPT
sudo iptables-save
```

**Sicherheitshinweis**: Öffnen Sie Port 5432 nur, wenn absolut nötig. Für Docker-Container reicht meist die interne Verbindung!

### Schritt 6: Prisma Migrationen ausführen

Nach der erfolgreichen Datenbankverbindung:

```bash
cd /var/www/vhosts/lsc-nc.de/crc-ws/apps/api

# .env Datei muss im Root-Verzeichnis liegen
cd /var/www/vhosts/lsc-nc.de/crc-ws

# Migrationen ausführen
DATABASE_URL="postgresql://lsc:PASSWORT@172.17.0.1:5432/lsc_website?schema=public" \
  npx prisma migrate deploy --schema=./apps/api/prisma/schema.prisma

# Oder im Container:
docker exec -it lasanta-api sh
pnpm prisma migrate deploy
exit
```

## Troubleshooting

### Problem: "Can't reach database server"

**Symptom**: 
```
Error: P1001: Can't reach database server at `172.17.0.1:5432`
```

**Lösungen**:
1. Prüfen Sie, ob PostgreSQL läuft: `sudo systemctl status postgresql`
2. Prüfen Sie, ob PostgreSQL auf Port 5432 lauscht: `sudo netstat -tlnp | grep 5432`
3. Prüfen Sie die `pg_hba.conf` Konfiguration
4. Prüfen Sie die Firewall-Regeln
5. Versuchen Sie verschiedene Host-Adressen:
   - `172.17.0.1` (Docker Bridge)
   - `host.docker.internal`
   - `135.116.64.230` (externe IP)

### Problem: "password authentication failed"

**Symptom**:
```
Error: P1001: password authentication failed for user "lsc"
```

**Lösungen**:
1. Überprüfen Sie das Passwort in der `.env` Datei
2. Stellen Sie sicher, dass der Benutzer in PostgreSQL existiert:
   ```bash
   sudo -u postgres psql
   \du  # Liste alle Benutzer
   \l   # Liste alle Datenbanken
   ```
3. Überprüfen Sie die Authentifizierungsmethode in `pg_hba.conf`

### Problem: Port 3306 statt 5432

**Symptom**: Prisma versucht sich mit Port 3306 zu verbinden

**Ursache**: DATABASE_URL zeigt auf eine MySQL-Datenbank

**Lösung**: 
1. Erstellen Sie eine **PostgreSQL**-Datenbank (nicht MySQL!)
2. Aktualisieren Sie die `DATABASE_URL` mit Port `5432`
3. Stellen Sie sicher, dass der Connection String mit `postgresql://` beginnt (nicht `mysql://`)

### Docker Bridge IP herausfinden

```bash
# Standard Docker Bridge IP
docker network inspect bridge | grep Gateway

# Oder aus dem Container heraus:
docker run --rm alpine ip route | grep default
```

## Verbindungstest

### Von der Kommandozeile

```bash
# Mit psql
psql -h 172.17.0.1 -U lsc -d lsc_website

# Mit Docker
docker run --rm -it postgres:15 psql -h 172.17.0.1 -U lsc -d lsc_website
```

### Von Node.js / Prisma

```bash
# Im Projekt-Root
node -e "const { PrismaClient } = require('@prisma/client'); \
  const prisma = new PrismaClient(); \
  prisma.\$connect() \
    .then(() => console.log('✅ DB Connected!')) \
    .catch(err => console.error('❌ Error:', err.message))"
```

## Zusammenfassung der benötigten Änderungen

1. ✅ **PostgreSQL installieren** (nicht MySQL/MariaDB)
2. ✅ **PostgreSQL-Datenbank in Plesk erstellen**
3. ✅ **pg_hba.conf konfigurieren** (Docker-Zugriff erlauben)
4. ✅ **postgresql.conf anpassen** (listen_addresses)
5. ✅ **DATABASE_URL in .env setzen** (mit richtiger IP/Port)
6. ✅ **Prisma Migrationen ausführen**
7. ✅ **Docker Stack starten**

Viel Erfolg! 🚀

