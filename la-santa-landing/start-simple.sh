#!/bin/bash

# La Santa Landing Page - Simple Start (ohne Docker)
# ====================================================

echo "╔═══════════════════════════════════════════════════════╗"
echo "║                                                       ║"
echo "║           LA SANTA - Landing Page Konzept            ║"
echo "║                                                       ║"
echo "║          Lealtad. Honor. Sangre.                     ║"
echo "║                                                       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo "❌ Python ist nicht installiert!"
    echo ""
    echo "Bitte installiere Python:"
    echo "  Ubuntu/Debian: sudo apt install python3"
    echo "  MacOS: brew install python3"
    echo ""
    echo "ODER starte Docker und nutze start.sh"
    exit 1
fi

echo "🚀 Starte lokalen Webserver..."
echo ""
echo "✅ Server gestartet!"
echo ""
echo "🌐 Öffne im Browser: http://localhost:8080"
echo ""
echo "Drücke Ctrl+C zum Stoppen"
echo ""
echo "════════════════════════════════════════════════════════"
echo ""

# Try python3 first, fallback to python
if command -v python3 &> /dev/null; then
    python3 -m http.server 8080
else
    python -m http.server 8080
fi

