#!/bin/bash

# Test Script für Docker Compose V2 Kompatibilität
# Prüft ob alle Scripts mit dem neuen `docker compose` Befehl funktionieren

echo "🧪 Docker Compose V2 Kompatibilitäts-Test"
echo "=========================================="

# Prüfe Docker Compose Version
echo "📋 Docker Compose Version:"
docker compose version
echo ""

# Teste alle wichtigen Befehle
echo "🔧 Teste Docker Compose Befehle..."

echo "1. 📋 Container Status:"
docker compose ps
echo ""

echo "2. 🏥 Health Check:"
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
echo ""

echo "3. 📊 Logs Test (letzte 5 Zeilen):"
docker compose logs --tail=5
echo ""

echo "4. 🗄️  Volumes Test:"
docker compose config --volumes
echo ""

echo "5. 🌐 Network Test:"
docker compose config --networks
echo ""

# Teste Production Config
if [ -f "docker-compose.prod.yml" ]; then
    echo "6. 🚀 Production Config Test:"
    docker compose -f docker-compose.prod.yml config --quiet
    if [ $? -eq 0 ]; then
        echo "✅ Production Config ist gültig"
    else
        echo "❌ Production Config hat Fehler"
    fi
    echo ""
fi

echo "✅ Alle Docker Compose V2 Tests abgeschlossen!"
echo ""
echo "📝 Verfügbare Befehle:"
echo "  docker compose up -d                    # Container starten"
echo "  docker compose down                     # Container stoppen"
echo "  docker compose ps                       # Status anzeigen"
echo "  docker compose logs -f                  # Logs verfolgen"
echo "  docker compose restart [service]        # Service neustarten"
echo "  docker compose exec [service] [command] # Befehl in Container ausführen"
