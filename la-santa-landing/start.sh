#!/bin/bash

# La Santa Landing Page - Start Script
# =====================================

echo "╔═══════════════════════════════════════════════════════╗"
echo "║                                                       ║"
echo "║           LA SANTA - Landing Page Konzept            ║"
echo "║                                                       ║"
echo "║          Lealtad. Honor. Sangre.                     ║"
echo "║                                                       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker ist nicht installiert!"
    echo "   Bitte installiere Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose ist nicht installiert!"
    echo "   Bitte installiere Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "🔧 Umgebung wird vorbereitet..."
echo ""

# Ask for environment
echo "Welche Umgebung möchtest du starten?"
echo ""
echo "  1) Development (Port 8080)"
echo "  2) Production (Port 80)"
echo ""
read -p "Auswahl [1/2]: " choice

case $choice in
    1)
        echo ""
        echo "🚀 Starte Development-Umgebung..."
        echo ""
        docker-compose down 2>/dev/null
        docker-compose up -d --build
        
        if [ $? -eq 0 ]; then
            echo ""
            echo "✅ Erfolgreich gestartet!"
            echo ""
            echo "🌐 Öffne im Browser: http://localhost:8080"
            echo ""
            echo "📋 Nützliche Befehle:"
            echo "   docker-compose logs -f    # Logs anzeigen"
            echo "   docker-compose down       # Stoppen"
            echo "   docker-compose restart    # Neustarten"
            echo ""
        else
            echo ""
            echo "❌ Fehler beim Starten!"
            exit 1
        fi
        ;;
    2)
        echo ""
        echo "🚀 Starte Production-Umgebung..."
        echo ""
        docker-compose -f docker-compose.prod.yml down 2>/dev/null
        docker-compose -f docker-compose.prod.yml up -d --build
        
        if [ $? -eq 0 ]; then
            echo ""
            echo "✅ Erfolgreich gestartet!"
            echo ""
            echo "🌐 Öffne im Browser: http://localhost"
            echo ""
            echo "📋 Nützliche Befehle:"
            echo "   docker-compose -f docker-compose.prod.yml logs -f    # Logs anzeigen"
            echo "   docker-compose -f docker-compose.prod.yml down       # Stoppen"
            echo "   docker-compose -f docker-compose.prod.yml restart    # Neustarten"
            echo ""
        else
            echo ""
            echo "❌ Fehler beim Starten!"
            exit 1
        fi
        ;;
    *)
        echo ""
        echo "❌ Ungültige Auswahl!"
        exit 1
        ;;
esac

echo "════════════════════════════════════════════════════════"
echo ""
echo "  La Santa - Desde las Sombras"
echo ""
echo "════════════════════════════════════════════════════════"

