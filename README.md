# LaSanta Calavera 💀

Ein vollwertiges Web-Dashboard für ein GTA-RP Kartell mit **Discord OAuth**, **modularem Design**, **Lagerverwaltung** und **Schwarzgeld-Kassensystem**.

## 🚀 Features

- **Discord OAuth2 Authentifizierung** mit JWT und RBAC
- **Modulares Dashboard** mit Übersichtskarten
- **Lagerverwaltung**: Ein-/Auslagerung, Inventur, kritische Bestände
- **Kassensystem**: Schwarzgeld-Buchungen mit Genehmigungsworkflow
- **Audit-Log** für alle Aktionen
- **Responsive Design** mit dunklem Theme (Bordeaux/Anthrazit/Bronze)
- **Echtzeit-Updates** mit React Query

## 🏗️ Tech Stack

### Backend
- **NestJS** (TypeScript)
- **Prisma** ORM
- **PostgreSQL** Database
- **Discord OAuth2** + JWT
- **RBAC** (Role-Based Access Control)

### Frontend
- **React 18** + **TypeScript**
- **Vite** Build Tool
- **TailwindCSS** + **shadcn/ui**
- **React Query** für State Management
- **Zustand** für Auth State
- **React Hook Form** + **Zod** Validation
- **Recharts** für Diagramme

## 📦 Projektstruktur

```
lasanta-calavera/
├── apps/
│   ├── api/          # NestJS Backend
│   └── web/          # React Frontend
├── packages/         # Shared packages (optional)
├── docker-compose.yml
├── pnpm-workspace.yaml
└── README.md
```

## 🛠️ Installation & Setup

### Voraussetzungen

- **Node.js 18+**
- **pnpm** (Package Manager)
- **Docker & Docker Compose**
- **Discord Developer Account**

### 1. Repository klonen

```bash
git clone <repository-url>
cd lasanta-calavera
```

### 2. Dependencies installieren

```bash
# Alle Packages installieren
pnpm install
```

### 3. Discord OAuth einrichten

1. Gehe zu [Discord Developer Portal](https://discord.com/developers/applications)
2. Erstelle eine neue Application
3. Gehe zu **OAuth2** → **General**
4. Füge Redirect URI hinzu: `http://localhost:3000/api/auth/discord/callback`
5. Notiere dir **Client ID** und **Client Secret**

### 4. Umgebungsvariablen konfigurieren

```bash
# Kopiere die Beispiel-Datei
cp env.example .env

# Bearbeite .env und füge deine Discord-Credentials ein
```

**Wichtige Variablen:**
```env
DISCORD_CLIENT_ID=your_discord_client_id_here
DISCORD_CLIENT_SECRET=your_discord_client_secret_here
```

### 5. Entwicklungsumgebung starten

```bash
# Mit Docker Compose (empfohlen)
docker-compose up -d

# Oder manuell (erfordert lokale PostgreSQL)
pnpm dev
```

### 6. Datenbank initialisieren

```bash
# Prisma Migrationen ausführen
pnpm --filter api db:migrate

# Seed-Daten laden
pnpm --filter api db:seed
```

## 🌐 URLs

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000/api
- **Prisma Studio**: http://localhost:5555 (nach `pnpm --filter api db:studio`)

## 👥 Benutzerrollen

| Rolle | Berechtigung |
|-------|-------------|
| **ADMIN** | Vollzugriff, Benutzerverwaltung, Systemeinstellungen |
| **QUARTIERMEISTER** | Lager-Management, Transaktions-Genehmigungen |
| **MITGLIED** | Lager-Anfragen, eigene Buchungen |
| **GAST** | Nur Lesen (eingeschränkt) |

*Neue Benutzer erhalten standardmäßig die Rolle **MITGLIED**.*

## 📊 Module

### 🎒 Lagerverwaltung
- **Artikel-Typen**: Waffen, Munition, Ausrüstung, Medizin, etc.
- **Bewegungen**: Einlagerung, Auslagerung, Reservierung, Inventur
- **Features**: Mindestbestände, kritische Warnungen, Batch-Nummern
- **Export**: CSV/JSON Export

### 💰 Kassensystem
- **Schwarzgeld-Buchungen**: Einzahlung, Auszahlung, Transfer, Korrektur
- **Genehmigungsworkflow**: 4-Augen-Prinzip ab konfigurierbarem Schwellwert
- **Dashboard**: Saldo-Übersicht, Charts, Kategorien
- **Audit**: Vollständige Nachverfolgbarkeit

## 🔧 Entwicklung

### Backend entwickeln

```bash
cd apps/api

# Development Server
pnpm dev

# Prisma Studio
pnpm db:studio

# Tests
pnpm test
```

### Frontend entwickeln

```bash
cd apps/web

# Development Server
pnpm dev

# Build
pnpm build

# Preview
pnpm preview
```

### Datenbank-Änderungen

```bash
# Neue Migration erstellen
pnpm --filter api prisma migrate dev --name migration_name

# Prisma Client regenerieren
pnpm --filter api db:generate

# Seed-Daten neu laden
pnpm --filter api db:seed
```

## 🚀 Production Deployment

### 1. Environment Variables setzen

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET=your-super-secure-jwt-secret
JWT_REFRESH_SECRET=your-super-secure-refresh-secret
DISCORD_CLIENT_ID=your_production_discord_client_id
DISCORD_CLIENT_SECRET=your_production_discord_client_secret
DISCORD_REDIRECT_URI=https://yourdomain.com/api/auth/discord/callback
FRONTEND_URL=https://yourdomain.com
```

### 2. Build & Deploy

```bash
# Build alle Apps
pnpm build

# Database Migration
pnpm --filter api db:migrate

# Start Production
pnpm --filter api start:prod
```

## 🧪 Testing

```bash
# Unit Tests
pnpm test

# E2E Tests
pnpm test:e2e

# Coverage
pnpm test:cov
```

## 📝 API Documentation

Die API läuft auf `http://localhost:3000/api` mit folgenden Hauptendpunkten:

### Auth
- `GET /auth/discord` - Discord OAuth Login
- `GET /auth/discord/callback` - OAuth Callback
- `GET /auth/me` - Current User
- `POST /auth/logout` - Logout

### Lager
- `GET /items` - Artikel auflisten
- `POST /items` - Artikel erstellen
- `POST /items/:id/move` - Artikel bewegen
- `GET /items/:id/movements` - Bewegungshistorie

### Kasse
- `GET /cash/summary` - Saldo-Übersicht
- `GET /cash/transactions` - Transaktionen
- `POST /cash/transactions` - Neue Buchung
- `POST /cash/transactions/:id/approve` - Genehmigen

## 🔐 Sicherheit

- **HTTP-Only Cookies** für JWT Tokens
- **CSRF Protection** auf mutierende Endpunkte
- **Rate Limiting** auf Auth & kritische Endpunkte
- **Input Validation** mit Zod/class-validator
- **RBAC Guards** auf allen geschützten Routen
- **Audit Logging** für alle Aktionen

## 🐛 Troubleshooting

### Discord OAuth funktioniert nicht
- Prüfe Client ID/Secret in `.env`
- Stelle sicher, dass Redirect URI in Discord App konfiguriert ist
- Überprüfe, dass `DISCORD_REDIRECT_URI` korrekt ist

### Database Connection Error
- Stelle sicher, dass PostgreSQL läuft
- Prüfe `DATABASE_URL` in `.env`
- Bei Docker: `docker-compose up db`

### Frontend kann nicht auf API zugreifen
- Stelle sicher, dass API auf Port 3000 läuft
- Prüfe CORS-Konfiguration in `main.ts`
- Bei Docker: Stelle sicher, dass alle Services laufen

## 📄 Lizenz

Dieses Projekt ist für den internen Gebrauch des LaSanta Calavera Kartells bestimmt.

---

**💀 Viva La Santa 💀**

Bei Fragen oder Problemen wende dich an die Kartell-Administration.

