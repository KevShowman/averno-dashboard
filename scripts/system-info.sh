#!/bin/bash

# LaSanta Calavera System Information Script
# Zeigt wichtige System-Informationen für die VM

echo "💀 LaSanta Calavera System Information"
echo "======================================"
echo ""

# Docker Info
echo "🐳 Docker Status:"
if command -v docker &> /dev/null; then
    docker --version
    docker-compose --version
    echo "✅ Docker ist installiert"
else
    echo "❌ Docker ist nicht installiert"
fi
echo ""

# Container Status
echo "📦 Container Status:"
if docker-compose ps 2>/dev/null | grep -q "Up"; then
    docker-compose ps
else
    echo "❌ Keine Container laufen"
fi
echo ""

# Volumes
echo "🗄️  Docker Volumes:"
docker volume ls | grep lasanta || echo "Keine LaSanta Volumes gefunden"
echo ""

# Disk Usage
echo "💾 Speicherplatz:"
df -h | grep -E "(Filesystem|/dev/)"
echo ""

# Memory Usage
echo "🧠 Speicherverbrauch:"
free -h
echo ""

# Network Ports
echo "🌐 Netzwerk-Ports:"
netstat -tlnp 2>/dev/null | grep -E ":(80|443|3000|5432)" || echo "Keine relevanten Ports gefunden"
echo ""

# Backup Status
echo "💾 Backup Status:"
if [ -d "./backups" ]; then
    BACKUP_COUNT=$(ls -1 ./backups/lasanta_backup_*.sql 2>/dev/null | wc -l)
    echo "✅ Backups gefunden: $BACKUP_COUNT"
    if [ $BACKUP_COUNT -gt 0 ]; then
        LATEST_BACKUP=$(ls -t ./backups/lasanta_backup_*.sql 2>/dev/null | head -1)
        BACKUP_SIZE=$(du -h "$LATEST_BACKUP" 2>/dev/null | cut -f1)
        BACKUP_DATE=$(stat -c %y "$LATEST_BACKUP" 2>/dev/null | cut -d' ' -f1)
        echo "📅 Letztes Backup: $BACKUP_DATE ($BACKUP_SIZE)"
    fi
else
    echo "❌ Backup-Verzeichnis nicht gefunden"
fi
echo ""

# Environment Check
echo "🔧 Umgebungsvariablen:"
if [ -f ".env" ]; then
    echo "✅ .env Datei gefunden"
    ENV_VARS=$(grep -E "^(POSTGRES_PASSWORD|JWT_SECRET|DISCORD_.*|.*_URL)" .env | wc -l)
    echo "📋 Konfigurierte Variablen: $ENV_VARS"
else
    echo "❌ .env Datei nicht gefunden"
fi
echo ""

# SSL Check
echo "🔒 SSL Status:"
if [ -d "./ssl" ] && [ "$(ls -A ./ssl)" ]; then
    echo "✅ SSL-Zertifikate gefunden"
else
    echo "⚠️  Keine SSL-Zertifikate gefunden"
fi
echo ""

# Service URLs
echo "🌐 Service URLs:"
echo "Frontend: http://localhost (oder deine FRONTEND_URL)"
echo "API: http://localhost:3000"
echo "Datenbank: localhost:5432"
echo ""

echo "📋 Nützliche Befehle:"
echo "  ./scripts/backup-database.sh                    # Backup erstellen"
echo "  ./scripts/manage-volumes.sh info                # Volume-Info"
echo "  docker-compose -f docker-compose.prod.yml ps    # Status anzeigen"
echo "  docker-compose -f docker-compose.prod.yml logs  # Logs anzeigen"
echo ""

echo "🎉 System-Check abgeschlossen!"
