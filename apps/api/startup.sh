#!/bin/sh
set -e

echo "🚀 Starting LaSanta Calavera API..."

# Warte kurz auf Datenbank-Verbindung
echo "⏳ Waiting for database connection..."
sleep 3

# Prisma Migration mit accept-data-loss flag
echo "📦 Running Prisma migrations..."
npx prisma migrate deploy --accept-data-loss || {
    echo "⚠️  Migration failed, trying with db push..."
    npx prisma db push --accept-data-loss --skip-generate
}

# Generiere Prisma Client
echo "🔄 Generating Prisma Client..."
npx prisma generate

# Starte die Anwendung
echo "✅ Starting NestJS application..."
exec node dist/main.js

