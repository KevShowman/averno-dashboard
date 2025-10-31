#!/bin/sh
set -e

echo "🚀 Starting LaSanta Calavera API..."

# Warte auf Datenbank-Verbindung
echo "⏳ Waiting for database connection..."
sleep 5

# Prisma DB Push (mit force für Production)
echo "📦 Syncing database schema..."
npx prisma db push --accept-data-loss --skip-generate

echo "✅ Database schema synchronized"

# Starte die Anwendung
echo "✅ Starting NestJS application..."
exec node dist/src/main.js

