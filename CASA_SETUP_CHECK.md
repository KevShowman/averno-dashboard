# 🏠 Casa System - Setup & Pfad-Übersicht

## 📁 Datei-Struktur

```
crc-ws/
├── apps/api/
│   ├── uploads/casa/              ← Lokale Default-Bilder
│   │   ├── .gitkeep
│   │   ├── default-aussen-einfahrt.png (3.95 MB) ✅
│   │   ├── default-aussen-terasseundpool.png (3.59 MB) ✅
│   │   ├── default-innen-barbereich.png (2.93 MB) ✅
│   │   └── default-innen-wohnzimmer.png (2.91 MB) ✅
│   │
│   └── src/casa/
│       ├── casa.controller.ts     ← API Endpoints
│       ├── casa.service.ts        ← Business Logic
│       ├── casa-init.service.ts   ← Auto-Initialisierung
│       └── casa.module.ts         ← NestJS Modul
│
└── apps/web/src/pages/
    └── CasaPage.tsx               ← Frontend UI
```

## 🔄 Pfad-Mapping

### Lokal (Development):
- **Speicherort**: `./apps/api/uploads/casa/`
- **DB Path**: `./uploads/casa/default-*.png`
- **API URL**: `http://localhost:3000/uploads/casa/default-*.png`
- **Frontend URL**: `${VITE_API_URL}/uploads/casa/default-*.png`

### Docker (Production):
- **Container Path**: `/app/uploads/casa/`
- **Volume Mount**: `api_uploads:/app/uploads`
- **API URL**: `https://lsc-nc.de/api/uploads/casa/default-*.png`

## 🐳 Docker Build Flow

### Build Stage:
```dockerfile
WORKDIR /app
COPY . .
RUN mkdir -p uploads/casa
COPY uploads/casa/*.png uploads/casa/     # ✅ Default-Bilder kopieren
RUN pnpm exec prisma generate
RUN pnpm run build
```

### Production Stage:
```dockerfile
WORKDIR /app
COPY --from=build /app/uploads ./uploads  # ✅ Bilder aus Build Stage
RUN mkdir -p uploads/casa logs            # ✅ Verzeichnis erstellen
```

## 🔧 Backend-Konfiguration

### main.ts - Static File Serving:
```typescript
app.useStaticAssets(join(process.cwd(), 'uploads'), {
  prefix: '/uploads/',
});
```
**Ergebnis**: `/uploads/casa/default-*.png` → Dateisystem

### casa.controller.ts - File Upload:
```typescript
storage: diskStorage({
  destination: './uploads/casa',  // ✅ Relativer Pfad zu process.cwd()
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
    cb(null, uniqueName);
  },
})
```

### casa-init.service.ts - Auto-Init:
```typescript
private readonly defaultImages = [
  { 
    filename: 'default-aussen-einfahrt.png', 
    path: './uploads/casa/default-aussen-einfahrt.png'  // ✅ Relativer Pfad
  },
  // ... weitere Bilder
];
```

## 📊 Datenbank-Schema

### casa_images Tabelle:
```sql
CREATE TABLE `casa_images` (
  `id` VARCHAR(191) NOT NULL,
  `filename` VARCHAR(255) NOT NULL,              -- z.B. 'default-aussen-einfahrt.png'
  `path` VARCHAR(500) NOT NULL,                  -- './uploads/casa/default-aussen-einfahrt.png'
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
);
```

## 🚀 Initialisierung

### 1. Automatisch beim App-Start:
`CasaInitService.onModuleInit()` läuft automatisch und:
- ✅ Prüft ob Bilder physisch existieren
- ✅ Fügt fehlende Bilder zur Datenbank hinzu
- ✅ Verhindert Duplikate

### 2. Manuell via SQL:
```sql
-- 1. CASA_MIGRATION.sql (Tabelle erstellen)
-- 2. CASA_DEFAULT_IMAGES.sql (Bilder einfügen)
```

## 🔍 Verifizierung

### Check 1: Dateien im Container
```bash
docker exec lasanta-api ls -lh /app/uploads/casa/
```
**Erwartung**: 4 PNG-Dateien + .gitkeep

### Check 2: API Endpoint
```bash
curl http://localhost:3000/api/casa
```
**Erwartung**: JSON mit 4 Bildern

### Check 3: Bild-URL direkt
```bash
curl -I http://localhost:3000/uploads/casa/default-aussen-einfahrt.png
```
**Erwartung**: HTTP 200 OK

### Check 4: Frontend
Browser → `http://localhost:5173/casa`
**Erwartung**: 4 Bilder der Villa sichtbar

## ⚠️ Troubleshooting

### Problem: Bilder nicht sichtbar
**Lösung**:
1. Prüfe ob Dateien existieren: `ls apps/api/uploads/casa/`
2. Prüfe DB: `SELECT * FROM casa_images;`
3. Prüfe Container: `docker exec lasanta-api ls /app/uploads/casa/`
4. Prüfe Logs: `docker logs lasanta-api | grep "Casa"`

### Problem: 404 bei Upload
**Lösung**: Verzeichnis existiert nicht → `mkdir -p uploads/casa`

### Problem: Duplikate in DB
**Lösung**: SQL verwendet `NOT EXISTS` - sollte nicht passieren

## ✅ Final Checklist

- [x] 4 PNG-Dateien in `apps/api/uploads/casa/`
- [x] `.gitkeep` für Git
- [x] Dockerfile kopiert Bilder in beide Stages
- [x] `main.ts` serviert `/uploads/` als static
- [x] `casa-init.service.ts` initialisiert bei Start
- [x] SQL-Migrations-Dateien erstellt
- [x] Frontend zeigt Bilder über `${API_URL}/uploads/casa/*.png`
- [x] Docker Volume `api_uploads` gemounted
- [x] CORS erlaubt Frontend-Domain

## 📝 Notizen

- **Pfade sind konsistent**: Überall `./uploads/casa/` oder `/app/uploads/casa/`
- **Volume Persistence**: Uploads bleiben bei Container-Neustart erhalten
- **Auto-Init**: Bilder werden automatisch geladen, kein manueller Schritt nötig
- **Sichere Uploads**: Nur Leadership kann Bilder hochladen/löschen
- **Duplikat-Schutz**: `CasaInitService` prüft vor dem Einfügen

