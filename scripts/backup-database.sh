#!/bin/bash

# LaSanta Calavera Database Backup Script
# Dieses Script erstellt automatische Backups der PostgreSQL-Datenbank

set -e

# Konfiguration
CONTAINER_NAME="lasanta-db"
DB_NAME="lasanta_db"
DB_USER="lasanta"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/lasanta_backup_${TIMESTAMP}.sql"

# Backup-Verzeichnis erstellen falls es nicht existiert
mkdir -p "$BACKUP_DIR"

echo "🗄️  Starte Datenbank-Backup..."
echo "📅 Zeitstempel: $TIMESTAMP"
echo "📁 Backup-Datei: $BACKUP_FILE"

# Datenbank-Backup erstellen
docker exec $CONTAINER_NAME pg_dump -U $DB_USER -d $DB_NAME > "$BACKUP_FILE"

# Prüfen ob Backup erfolgreich war
if [ $? -eq 0 ]; then
    echo "✅ Backup erfolgreich erstellt: $BACKUP_FILE"
    
    # Backup-Größe anzeigen
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "📊 Backup-Größe: $BACKUP_SIZE"
    
    # Alte Backups löschen (älter als 30 Tage)
    echo "🧹 Lösche alte Backups (älter als 30 Tage)..."
    find "$BACKUP_DIR" -name "lasanta_backup_*.sql" -mtime +30 -delete
    
    echo "🎉 Backup-Prozess abgeschlossen!"
else
    echo "❌ Fehler beim Erstellen des Backups!"
    exit 1
fi
