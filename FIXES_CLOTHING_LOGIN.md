# Fixes für Kleidungsverwaltung und Login

## Probleme behoben:

### 1. Kleidung wird nicht richtig gespeichert ✅
**Problem:** Frontend sendete Daten ohne Male/Female Suffixe
**Lösung:** 
- `ClothingManagementPage.tsx` komplett überarbeitet
- Gender-Auswahl UI hinzugefügt (Männlich/Weiblich Buttons)
- Datenstruktur angepasst: Jedes Kleidungsteil hat jetzt `male` und `female` Objekte
- API-Call sendet jetzt korrekt formatierte Daten mit `maskItemMale`, `maskItemFemale`, etc.
- Item/Variation Felder werden automatisch deaktiviert und auf `null` gesetzt wenn "Anpassbar" aktiviert wird

### 2. Farbvorgabe: "z.B. 0 für schwarz" ergibt keinen Sinn ✅
**Problem:** Farbe als Zahl war unklar
**Lösung:**
- Farb-Input Label geändert zu: "Farbname (nur bei 'Anpassbar')"
- Placeholder geändert zu: "z.B. schwarz, rot, blau"
- Input-Typ von `number` zu `text` geändert
- Prisma Schema angepasst: Alle `color` Spalten von `Int?` auf `String?`
- SQL-Script erstellt: `FIX_CLOTHING_COLOR_TO_TEXT.sql`

### 3. "Eingeloggt bleiben" funktioniert nicht ✅
**Problem:** RememberMe Cookie wurde nicht mit richtiger Domain gesetzt
**Lösung:**
- `LoginPage.tsx`: Cookie wird jetzt mit `domain=${window.location.hostname}` gesetzt
- Backend (`auth.controller.ts`) liest bereits korrekt das Cookie und setzt entsprechend längere Token-Laufzeiten:
  - Mit rememberMe: Access Token 7 Tage, Refresh Token 30 Tage
  - Ohne rememberMe: Access Token 1 Stunde, Refresh Token 7 Tage

## Deployment-Schritte:

### 1. SQL in phpMyAdmin ausführen:
```sql
-- In FIX_CLOTHING_COLOR_TO_TEXT.sql
```

### 2. Prisma DB Push:
```bash
cd /var/www/vhosts/lsc-nc.de/crc-ws/apps/api
npx prisma db push
npx prisma generate
```

### 3. Docker neu bauen und deployen:
```bash
cd /var/www/vhosts/lsc-nc.de/crc-ws
docker compose -f docker-compose.prod.yml up --build -d
```

## Geänderte Dateien:

### Frontend:
- `apps/web/src/pages/ClothingManagementPage.tsx` - Komplett überarbeitet mit Gender-Auswahl
- `apps/web/src/pages/LoginPage.tsx` - Cookie mit Domain-Attribut

### Backend:
- `apps/api/prisma/schema.prisma` - Alle color Felder von `Int?` auf `String?`

### SQL:
- `FIX_CLOTHING_COLOR_TO_TEXT.sql` - ALTER TABLE für color Spalten

## Erwartetes Verhalten nach Deployment:

### Kleidungsverwaltung:
1. Leaderschaft wählt Ranggruppe aus
2. Leaderschaft wählt Geschlecht (Männlich/Weiblich)
3. Für jedes Kleidungsteil:
   - ENTWEDER: Item + Variation festlegen (fixiert)
   - ODER: "Anpassbar" aktivieren + Farbname eingeben (z.B. "schwarz")
4. Beim Speichern werden die Daten korrekt mit Male/Female Suffixen an Backend gesendet
5. Benutzer sehen dann die korrekte Kleidung basierend auf ihrem Geschlecht und Rang

### Login "Eingeloggt bleiben":
1. Checkbox wird standardmäßig aktiviert angezeigt
2. Beim Login wird Cookie mit korrekter Domain gesetzt
3. Backend liest Cookie und setzt entsprechend längere Token-Laufzeiten
4. User bleibt 7 Tage eingeloggt (statt nur 1 Stunde)

