#!/bin/sh
set -e

echo "🚀 Starting LaSanta Calavera API..."

# Warte auf Datenbank-Verbindung
echo "⏳ Waiting for database connection..."
sleep 5

# Prisma Migration mit accept-data-loss flag
echo "📦 Running Prisma migrations..."
if npx prisma migrate deploy --accept-data-loss; then
    echo "✅ Migrations applied successfully"
else
    echo "⚠️  Migration failed, trying with db push..."
    npx prisma db push --accept-data-loss --skip-generate
fi

# Starte die Anwendung
echo "✅ Starting NestJS application..."
exec node dist/main.js

