#!/bin/bash

# LaSanta Calavera Volume Management Script
# Dieses Script hilft bei der Verwaltung der Docker Volumes

set -e

# Funktionen
show_help() {
    echo "🗄️  LaSanta Calavera Volume Management"
    echo ""
    echo "📖 Verwendung: $0 [BEFEHL]"
    echo ""
    echo "🔧 Verfügbare Befehle:"
    echo "  list     - Zeige alle Volumes an"
    echo "  info     - Zeige Volume-Informationen"
    echo "  backup   - Erstelle Volume-Backup"
    echo "  clean    - Bereinige ungenutzte Volumes"
    echo "  reset    - ⚠️  Lösche alle Daten (GEFAHR!)"
    echo "  help     - Zeige diese Hilfe"
}

list_volumes() {
    echo "📋 Docker Volumes für LaSanta Calavera:"
    echo ""
    docker volume ls | grep lasanta || echo "Keine LaSanta Volumes gefunden."
    echo ""
    docker compose config --volumes
}

show_info() {
    echo "ℹ️  Volume-Informationen:"
    echo ""
    
    # PostgreSQL Volume
    echo "🗃️  PostgreSQL Datenbank:"
    if docker volume inspect lasanta_postgres_data >/dev/null 2>&1; then
        docker volume inspect lasanta_postgres_data --format "  📍 Mountpoint: {{.Mountpoint}}"
        docker volume inspect lasanta_postgres_data --format "  🗓️  Created: {{.CreatedAt}}"
    else
        echo "  ❌ Volume nicht gefunden"
    fi
    
    # API Volumes
    echo ""
    echo "🔧 API Volumes:"
    for volume in api_uploads api_logs; do
        if docker volume inspect lasanta_$volume >/dev/null 2>&1; then
            echo "  📁 $volume: $(docker volume inspect lasanta_$volume --format '{{.Mountpoint}}')"
        else
            echo "  ❌ $volume: Nicht gefunden"
        fi
    done
}

backup_volumes() {
    echo "💾 Erstelle Volume-Backup..."
    
    BACKUP_DIR="./backups/volumes"
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    BACKUP_PATH="$BACKUP_DIR/volumes_backup_$TIMESTAMP"
    
    mkdir -p "$BACKUP_PATH"
    
    # PostgreSQL Volume backup
    echo "🗃️  Backup PostgreSQL Volume..."
    docker run --rm -v lasanta_postgres_data:/data -v "$(pwd)/$BACKUP_PATH":/backup alpine tar czf /backup/postgres_data.tar.gz -C /data .
    
    # API Volumes backup
    for volume in api_uploads api_logs; do
        if docker volume inspect lasanta_$volume >/dev/null 2>&1; then
            echo "📁 Backup $volume Volume..."
            docker run --rm -v lasanta_$volume:/data -v "$(pwd)/$BACKUP_PATH":/backup alpine tar czf /backup/$volume.tar.gz -C /data .
        fi
    done
    
    echo "✅ Volume-Backup erstellt: $BACKUP_PATH"
}

clean_volumes() {
    echo "🧹 Bereinige ungenutzte Volumes..."
    docker volume prune -f
    echo "✅ Bereinigung abgeschlossen."
}

reset_volumes() {
    echo "⚠️  GEFAHR: Dies wird ALLE Daten löschen!"
    read -p "Bist du dir sicher? Schreibe 'JA' um fortzufahren: " confirmation
    
    if [ "$confirmation" != "JA" ]; then
        echo "❌ Abgebrochen."
        exit 1
    fi
    
    echo "🛑 Stoppe Container..."
    docker compose down
    
    echo "🗑️  Lösche Volumes..."
    docker volume rm lasanta_postgres_data lasanta_api_uploads lasanta_api_logs 2>/dev/null || true
    
    echo "✅ Alle Daten wurden gelöscht."
    echo "🚀 Starte System neu..."
    docker compose up -d
}

# Hauptlogik
case "${1:-help}" in
    list)
        list_volumes
        ;;
    info)
        show_info
        ;;
    backup)
        backup_volumes
        ;;
    clean)
        clean_volumes
        ;;
    reset)
        reset_volumes
        ;;
    help|*)
        show_help
        ;;
esac
