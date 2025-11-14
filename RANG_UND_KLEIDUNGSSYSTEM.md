# Rang- und Kleidungssystem - Implementierungsdokumentation

## Übersicht

Dieses Dokument beschreibt die Implementierung des neuen Rang- und Kleidungssystems für LaSanta Calavera.

## 1. Neue Ränge im Organigramm

### Leaderschaft (Automatisch synchronisiert)

| Rang | Role Enum | Discord-ID | Emoji |
|------|-----------|------------|-------|
| El Patrón | `EL_PATRON` | 1431388062474309701 | 👑 |
| Don - El Capitán | `DON_CAPITAN` | 1431388062474309699 | ⚔️ |
| Don - El Comandante | `DON_COMANDANTE` | 1438638866432135348 | 🛡️ |
| El Mano Derecha | `EL_MANO_DERECHA` | 1431388062474309698 | 🤝 |

**Automatische Synchronisierung:** Nur diese 4 Rollen werden automatisch mit der Website synchronisiert und entsprechend den Benutzern zugewiesen.

### Normale Ränge (1-9)

| Rang | Role Enum | Discord-ID | Emoji | Zuständigkeit |
|------|-----------|------------|-------|---------------|
| Rang 9 - El Custodio | `EL_CUSTODIO` | 1431388062427906229 | 🔒 | Sicherheitsbegleitung / Wachposten |
| Rang 8 - El Mentor | `EL_MENTOR` | 1438641189372035092 | 📚 | Ausbilder der Neulinge |
| Rang 7 - El Encargado | `EL_ENCARGADO` | 1438641369038979295 | 🧰 | Zuständiger / Koordinator |
| Rang 6 - El Teniente | `EL_TENIENTE` | 1438637584975921286 | ⭐ | Unteroffizier / Bereichsverantwortlicher |
| Rang 5 - Soldado | `SOLDADO` | 1431388062427906228 | 🧭 | Vollwertiger Soldat (Kern der Truppe) |
| Rang 4 - El Prefecto | `EL_PREFECTO` | 1438642330532839596 | 🐍 | Kontrollinstanz / Operationsaufsicht |
| Rang 3 - El Confidente | `EL_CONFIDENTE` | 1438641614481264743 | 🫢 | Vertrauensperson der Führung |
| Rang 2 - El Protector | `EL_PROTECTOR` | 1438639256275914752 | 🐢 | Schutz der Führung |
| Rang 1 - El Novato | `EL_NOVATO` | 1438636794181718199 | 🌱 | Neuling / Probezeit |

### Rollen-Hierarchie

```
16 - EL_PATRON (Höchste Rolle)
15 - DON_CAPITAN
14 - DON_COMANDANTE
13 - EL_MANO_DERECHA
12 - LOGISTICA (Legacy)
11 - ROUTENVERWALTUNG (Legacy)
10 - SICARIO (Legacy)
9  - EL_CUSTODIO
8  - EL_MENTOR
7  - EL_ENCARGADO
6  - EL_TENIENTE
5  - SOLDADO
4  - EL_PREFECTO
3  - EL_CONFIDENTE
2  - EL_PROTECTOR
1  - EL_NOVATO
0  - FUTURO (Legacy, niedrigste Rolle)
```

## 2. Kleidungsmanagement-System

### Konzept

Das Kleidungsmanagement-System ermöglicht es der Leaderschaft, Kleidung für verschiedene Rang-Gruppen festzulegen. Jede Rang-Gruppe kann eigene Kleidungs-Templates haben.

### Rang-Gruppen für Kleidung

- **Gruppe 1-3**: EL_NOVATO, EL_PROTECTOR, EL_CONFIDENTE
- **Gruppe 4-6**: EL_PREFECTO, SOLDADO, EL_TENIENTE
- **Gruppe 7-9**: EL_ENCARGADO, EL_MENTOR, EL_CUSTODIO
- **Individuelle Leaderschaft-Kleidung**: EL_PATRON, DON_CAPITAN, DON_COMANDANTE, EL_MANO_DERECHA

### Kleidungsteile

Jedes Kleidungsteil besteht aus:
- **Item (Kleidungsstück-Nummer)**: Die ID des Kleidungsstücks
- **Variation**: Die Variations-Nummer des Kleidungsstücks
- **Customizable (Checkbox)**: Ob der Rang dieses Teil selbst wählen darf
- **Color (Farbvorgabe)**: Wenn customizable = true, eine Farbvorgabe

Kleidungsteile:
1. **Maske** (maskItem, maskVariation)
2. **Torso** (torsoItem, torsoVariation)
3. **T-Shirt** (tshirtItem, tshirtVariation)
4. **Weste** (vesteItem, vesteVariation)
5. **Hose** (hoseItem, hoseVariation)
6. **Schuhe** (schuheItem, schuheVariation)

### Datenbank-Modelle

#### `RankClothingTemplate`

Speichert Kleidungs-Templates für jede Rang-Gruppe.

```prisma
model RankClothingTemplate {
  id               String   @id @default(cuid())
  rankGroup        String   @unique // "1-3", "4-6", "7-9", "EL_PATRON", etc.
  
  // Für jedes Kleidungsteil:
  maskItem         Int?
  maskVariation    Int?
  maskCustomizable Boolean  @default(false)
  maskColor        Int?
  
  // ... (torso, tshirt, veste, hose, schuhe)
  
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}
```

#### `UserClothing`

Speichert individuelle Kleidungsoptionen für User (nur für customizable Teile).

```prisma
model UserClothing {
  id              String   @id @default(cuid())
  userId          String   @unique
  
  // Nur die Teile, die der User selbst wählen darf
  maskItem        Int?
  maskVariation   Int?
  // ... (torso, tshirt, veste, hose, schuhe)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

## 3. API-Endpoints

### Kleidungs-Templates (Nur Leaderschaft)

- **GET** `/clothing/templates` - Alle Templates abrufen
- **GET** `/clothing/templates/:rankGroup` - Template für Rang-Gruppe abrufen
- **POST** `/clothing/templates/:rankGroup` - Template erstellen/aktualisieren

### Benutzer-Kleidung

- **GET** `/clothing/my-clothing` - Eigene Kleidung abrufen
- **GET** `/clothing/user/:userId` - Kleidung eines anderen Users abrufen (nur Leaderschaft)
- **PUT** `/clothing/my-clothing` - Eigene Kleidung aktualisieren (nur customizable Teile)

### Response-Struktur

```json
{
  "template": {
    "rankGroup": "1-3",
    "maske": {
      "item": 12,
      "variation": 3,
      "customizable": false,
      "color": 5
    },
    "torso": { ... },
    "tshirt": { ... },
    "veste": { ... },
    "hose": { ... },
    "schuhe": { ... }
  },
  "userCustomization": {
    "maske": null,
    "torso": { "item": 15, "variation": 2 }
  },
  "combinedClothing": {
    "maske": {
      "item": 12,
      "variation": 3,
      "color": 5,
      "customizable": false
    },
    "torso": {
      "item": 15,
      "variation": 2,
      "color": 1,
      "customizable": true
    },
    // ...
  }
}
```

## 4. Implementierte Dateien

### Backend (API)

#### Prisma Schema
- `apps/api/prisma/schema.prisma` - Aktualisiert mit neuen Rollen und Kleidungsmodellen

#### Clothing Modul
- `apps/api/src/clothing/clothing.module.ts` - Modul-Definition
- `apps/api/src/clothing/clothing.service.ts` - Business-Logik
- `apps/api/src/clothing/clothing.controller.ts` - REST-API-Endpoints

#### Aktualisierte Dateien
- `apps/api/src/app.module.ts` - ClothingModule registriert
- `apps/api/src/prisma/seed.ts` - Discord-Role-Mappings für neue Ränge
- `apps/api/src/discord/discord.service.ts` - Aktualisierte Rollen-Hierarchie

## 5. Migrations-Anleitung

### Schritt 1: Prisma Migration erstellen

```bash
cd apps/api
npx prisma migrate dev --name add_new_ranks_and_clothing_system
```

### Schritt 2: Seed ausführen

```bash
cd apps/api
npm run prisma:seed
```

Dies erstellt automatisch die Discord-Role-Mappings für alle neuen Ränge.

### Schritt 3: Discord-Synchronisierung

Nach der Migration sollten alle User neu synchronisiert werden:

```bash
# API-Endpoint aufrufen (erfordert Admin-Rechte)
POST /discord/sync-members
```

## 6. Frontend-Integration (TODO)

### Kleidungs-Management-Seite

**Zugriff:** Nur Leaderschaft

Features:
- Liste aller Rang-Gruppen
- Bearbeiten von Kleidungs-Templates
- Für jedes Kleidungsteil:
  - Item-Nummer eingeben
  - Variations-Nummer eingeben
  - Checkbox "Customizable"
  - Farb-Eingabe (wenn customizable)

### Benutzer-Kleidungsansicht

**Zugriff:** Alle Benutzer

Features:
- Anzeige der aktuellen Kleidung basierend auf Rang
- Bearbeitung von customizable Teilen
- Farbvorgaben beachten

## 7. Berechtigungsschema

### Automatische Synchronisierung

Nur folgende Rollen werden automatisch mit Discord synchronisiert:
- `EL_PATRON`
- `DON_CAPITAN`
- `DON_COMANDANTE`
- `EL_MANO_DERECHA`

Alle anderen Ränge müssen manuell im Organigramm zugewiesen werden.

### Kleidungs-Berechtigungen

- **Leaderschaft** (EL_PATRON, DON_CAPITAN, DON_COMANDANTE, EL_MANO_DERECHA):
  - Kann alle Templates bearbeiten
  - Kann alle User-Kleidungen ansehen
  
- **Normale Ränge**:
  - Können nur ihre eigene Kleidung sehen
  - Können nur customizable Teile bearbeiten

## 8. Testing

### API-Tests

```bash
cd apps/api
npm run test
```

### Manuelle Tests

1. **Rollen-Synchronisierung testen**
   - User mit neuen Discord-Rollen einloggen
   - Prüfen ob korrekte System-Rolle zugewiesen wird

2. **Kleidungs-Template erstellen**
   - Als Leaderschaft einloggen
   - Template für Rang-Gruppe erstellen
   - Prüfen ob gespeichert

3. **Benutzer-Kleidung anzeigen**
   - Als normaler User einloggen
   - Eigene Kleidung abrufen
   - Prüfen ob Template korrekt angewendet wird

4. **Customizable Teile bearbeiten**
   - Template mit customizable Teilen erstellen
   - Als User customizable Teil bearbeiten
   - Prüfen ob Farbvorgabe beachtet wird

## 9. Troubleshooting

### Problem: Migration schlägt fehl

**Lösung:** Prisma Client neu generieren:
```bash
cd apps/api
npx prisma generate
```

### Problem: Discord-Rollen werden nicht synchronisiert

**Lösung:** Prüfen ob Discord-Bot-Token und Guild-ID korrekt konfiguriert sind:
```bash
# In .env Datei:
DISCORD_BOT_TOKEN=...
DISCORD_GUILD_ID=...
```

### Problem: Kleidungs-Templates werden nicht angezeigt

**Lösung:** Prüfen ob Leaderschaft-Rolle korrekt zugewiesen ist:
```sql
SELECT role, allRoles FROM users WHERE id = 'USER_ID';
```

## 10. Zukünftige Erweiterungen

- Frontend-Integration für Kleidungs-Management
- Kleidungs-Vorschau im Browser
- Batch-Bearbeitung für mehrere Rang-Gruppen
- Kleidungs-History (Änderungsverlauf)
- Import/Export von Kleidungs-Templates

