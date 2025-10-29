# Plesk Reverse Proxy Konfiguration

Da Plesk bereits einen Webserver (Apache/Nginx) auf Port 80/443 betreibt, verwenden wir Plesk als Reverse Proxy für die Docker-Container.

## Container-Ports

Nach dem Deployment laufen folgende Services:
- **API (Backend)**: `http://localhost:3000`
- **Web (Frontend)**: `http://localhost:8080`

## Schritt 1: Domain in Plesk vorbereiten

1. Gehen Sie zu **Websites & Domains**
2. Wählen Sie Ihre Domain: `lsc-nc.de`
3. Klicken Sie auf **Apache & nginx Settings** (oder **Nginx Settings**)

## Schritt 2: Reverse Proxy Regeln hinzufügen

### Für Apache & nginx Modus (Standard auf Plesk)

Fügen Sie folgende Direktiven im Abschnitt **"Additional nginx directives"** hinzu:

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

### Alternative: Für reinen Nginx Modus

Falls Sie nur Nginx verwenden (ohne Apache), fügen Sie die gleichen Regeln in der Nginx-Konfiguration hinzu.

## Schritt 3: SSL/HTTPS aktivieren

1. In Plesk: **SSL/TLS Certificates**
2. Wählen Sie **Let's Encrypt**
3. Aktivieren Sie das Zertifikat für Ihre Domain
4. Aktivieren Sie **"Permanent SEO-safe 301 redirect from HTTP to HTTPS"**

Die Reverse Proxy Konfiguration funktioniert automatisch mit HTTPS!

## Schritt 4: Firewall-Regeln

Stellen Sie sicher, dass die internen Ports NICHT von außen erreichbar sind:

```bash
# Prüfen Sie, dass nur Port 80/443 von außen erreichbar sind
# Die Container-Ports 3000 und 8080 sollten nur intern erreichbar sein
```

Plesk's Firewall sollte standardmäßig nur Port 80/443 öffnen.

## Schritt 5: Testen

### API testen
```bash
curl https://lsc-nc.de/api/health
# oder im Browser
```

### Frontend testen
```bash
# Öffnen Sie im Browser
https://lsc-nc.de
```

## Alternative: Subdomain-Setup

Wenn Sie API und Frontend auf separaten Subdomains betreiben möchten:

### api.lsc-nc.de → API Backend

```nginx
location / {
    proxy_pass http://localhost:3000/;
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

### lsc-nc.de → Frontend

```nginx
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

**Hinweis**: Bei Subdomain-Setup müssen Sie auch die `.env` Variablen anpassen:
```bash
FRONTEND_URL=https://lsc-nc.de
API_BASE_URL=https://api.lsc-nc.de
DISCORD_REDIRECT_URI=https://api.lsc-nc.de/auth/discord/callback
```

## Troubleshooting

### Problem: 502 Bad Gateway

**Ursache**: Container sind nicht erreichbar oder nicht gestartet

**Lösung**:
```bash
# Container-Status prüfen
docker ps

# Container-Logs prüfen
docker logs lasanta-api
docker logs lasanta-web

# Container neu starten
docker restart lasanta-api lasanta-web
```

### Problem: API antwortet nicht

**Ursache**: Falsche Proxy-Konfiguration oder Container läuft nicht

**Lösung**:
```bash
# Prüfen Sie, ob der API-Container läuft
docker ps | grep lasanta-api

# Testen Sie den Container direkt
curl http://localhost:3000/health

# Wenn das funktioniert, ist die Proxy-Konfiguration falsch
```

### Problem: CORS-Fehler

**Ursache**: API erwartet andere Origin-URLs

**Lösung**: Prüfen Sie die `.env` Variablen:
```bash
FRONTEND_URL=https://lsc-nc.de  # Muss mit der tatsächlichen Domain übereinstimmen
API_BASE_URL=https://lsc-nc.de  # Wenn API unter /api/ läuft
```

### Problem: WebSocket-Verbindungen funktionieren nicht

**Ursache**: Upgrade-Header nicht korrekt weitergeleitet

**Lösung**: Stellen Sie sicher, dass folgende Zeilen in der Proxy-Konfiguration sind:
```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection 'upgrade';
```

## Nginx-Konfiguration überprüfen

Nach dem Speichern der Nginx-Direktiven:

```bash
# Syntax prüfen
nginx -t

# Nginx neu laden (Plesk macht das normalerweise automatisch)
service nginx reload
```

## Logs überwachen

### Plesk Logs
```bash
# Nginx Error Log
tail -f /var/log/nginx/error.log

# Domain-spezifische Logs
tail -f /var/www/vhosts/lsc-nc.de/logs/error_log
```

### Container Logs
```bash
# API Logs
docker logs -f lasanta-api

# Web Logs
docker logs -f lasanta-web
```

## Zusammenfassung

✅ Docker-Container laufen auf internen Ports (3000, 8080)
✅ Plesk Nginx/Apache fungiert als Reverse Proxy
✅ SSL/HTTPS wird von Plesk verwaltet
✅ Keine Port-Konflikte mit Plesk's Webserver

Diese Konfiguration ist die empfohlene Methode für Docker-Container auf Plesk!

