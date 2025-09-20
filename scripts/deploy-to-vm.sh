#!/bin/bash

# LaSanta Calavera VM Deployment Script
# Dieses Script bereitet das System für den produktiven Einsatz auf einer VM vor

set -e

echo "🚀 LaSanta Calavera VM Deployment"
echo "================================"

# Prüfe ob wir im richtigen Verzeichnis sind
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ docker-compose.yml nicht gefunden. Bitte im Projekt-Root ausführen."
    exit 1
fi

# Erstelle notwendige Verzeichnisse
echo "📁 Erstelle Verzeichnisse..."
mkdir -p backups
mkdir -p logs
mkdir -p ssl

# Setze Berechtigungen für Scripts
echo "🔧 Setze Script-Berechtigungen..."
chmod +x scripts/*.sh

# Prüfe ob .env existiert
if [ ! -f ".env" ]; then
    echo "⚠️  .env Datei nicht gefunden!"
    echo "📋 Erstelle .env aus env.prod.example..."
    
    if [ -f "env.prod.example" ]; then
        cp env.prod.example .env
        echo "✅ .env erstellt. Bitte fülle die Werte aus!"
        echo "📝 Wichtige Variablen zu setzen:"
        echo "   - POSTGRES_PASSWORD"
        echo "   - JWT_SECRET"
        echo "   - JWT_REFRESH_SECRET"
        echo "   - DISCORD_CLIENT_ID"
        echo "   - DISCORD_CLIENT_SECRET"
        echo "   - DISCORD_BOT_TOKEN"
        echo "   - DISCORD_GUILD_ID"
        echo "   - FRONTEND_URL"
        echo "   - API_BASE_URL"
        echo ""
        echo "🔄 Nach dem Ausfüllen: $0 --continue"
        exit 0
    else
        echo "❌ env.prod.example nicht gefunden!"
        exit 1
    fi
fi

# Wenn --continue Flag gesetzt, fahre mit Deployment fort
if [ "$1" != "--continue" ]; then
    echo "🔍 Prüfe Konfiguration..."
    echo "📋 Aktuelle .env Variablen:"
    grep -E "^(POSTGRES_PASSWORD|JWT_SECRET|DISCORD_.*|.*_URL)" .env | sed 's/=.*/=***/' || echo "Keine relevanten Variablen gefunden."
    echo ""
    echo "✅ Wenn alle Werte korrekt sind, führe aus: $0 --continue"
    exit 0
fi

# Docker Compose Build
echo "🔨 Baue Docker Images..."
docker-compose -f docker-compose.prod.yml build

# Stoppe alte Container
echo "🛑 Stoppe alte Container..."
docker-compose down 2>/dev/null || true

# Starte neue Container
echo "🚀 Starte neue Container..."
docker-compose -f docker-compose.prod.yml up -d

# Warte auf Services
echo "⏳ Warte auf Services..."
sleep 30

# Prüfe Health
echo "🏥 Prüfe Service Health..."
if docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    echo "✅ Services sind gestartet!"
else
    echo "❌ Einige Services sind nicht gestartet!"
    docker-compose -f docker-compose.prod.yml ps
    exit 1
fi

# Erstelle ersten Backup
echo "💾 Erstelle ersten Backup..."
./scripts/backup-database.sh

# Setup Discord Rollen
echo "🔧 Richte Discord-Rollen ein..."
docker-compose exec api pnpm setup-discord-roles

# Zeige Status
echo ""
echo "🎉 Deployment abgeschlossen!"
echo "=========================="
echo "🌐 Frontend: http://localhost (oder deine FRONTEND_URL)"
echo "🔧 API: http://localhost:3000"
echo "🗄️  Datenbank: localhost:5432"
echo ""
echo "📋 Nützliche Befehle:"
echo "  docker-compose -f docker-compose.prod.yml ps          # Status anzeigen"
echo "  docker-compose -f docker-compose.prod.yml logs -f     # Logs anzeigen"
echo "  ./scripts/backup-database.sh                          # Backup erstellen"
echo "  ./scripts/manage-volumes.sh info                      # Volume-Info"
echo ""
echo "🔒 Vergiss nicht:"
echo "  - SSL-Zertifikate für HTTPS einrichten"
echo "  - Firewall konfigurieren"
echo "  - Regelmäßige Backups planen"
echo "  - Logs überwachen"
