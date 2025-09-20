#!/bin/bash

# LaSanta Calavera Database Restore Script
# Dieses Script stellt ein Backup der PostgreSQL-Datenbank wieder her

set -e

# Konfiguration
CONTAINER_NAME="lasanta-db"
DB_NAME="lasanta_db"
DB_USER="lasanta"
BACKUP_DIR="./backups"

# Prüfen ob Backup-Datei angegeben wurde
if [ $# -eq 0 ]; then
    echo "❌ Keine Backup-Datei angegeben!"
    echo "📖 Verwendung: $0 <backup-file>"
    echo ""
    echo "📁 Verfügbare Backups:"
    ls -la "$BACKUP_DIR"/lasanta_backup_*.sql 2>/dev/null || echo "Keine Backups gefunden."
    exit 1
fi

BACKUP_FILE="$1"

# Prüfen ob Backup-Datei existiert
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup-Datei nicht gefunden: $BACKUP_FILE"
    exit 1
fi

echo "🗄️  Starte Datenbank-Restore..."
echo "📁 Backup-Datei: $BACKUP_FILE"

# Bestätigung einholen
read -p "⚠️  ACHTUNG: Dies wird die aktuelle Datenbank überschreiben! Fortfahren? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Restore abgebrochen."
    exit 1
fi

# Container prüfen
if ! docker ps | grep -q $CONTAINER_NAME; then
    echo "❌ Container $CONTAINER_NAME ist nicht gestartet!"
    echo "🚀 Starte Container..."
    docker-compose up -d db
    sleep 10
fi

echo "🔄 Stelle Datenbank wieder her..."

# Datenbank wiederherstellen
docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME < "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Datenbank erfolgreich wiederhergestellt!"
    echo "🔄 Starte API neu für Schema-Updates..."
    docker-compose restart api
    echo "🎉 Restore-Prozess abgeschlossen!"
else
    echo "❌ Fehler beim Wiederherstellen der Datenbank!"
    exit 1
fi
