# Fix: "Eingeloggt bleiben" funktioniert jetzt richtig! ✅

## Problem:
Das `rememberMe` Cookie wurde zwar im Frontend gesetzt, aber nach der Discord OAuth Weiterleitung nicht mehr zurück zum Backend übertragen.

## Lösung:
Statt Cookie verwenden wir jetzt den OAuth `state` Parameter, der von Discord zurückgegeben wird:

### Workflow:
1. **Frontend (LoginPage.tsx)**: User wählt "Eingeloggt bleiben" → wird in `localStorage` gespeichert
2. **Frontend (auth.ts)**: Beim Login wird `rememberMe` aus localStorage gelesen und als `state` Parameter an Discord übergeben
3. **Backend (discord.strategy.ts)**: Discord gibt den `state` Parameter zurück → wird in `req.rememberMe` gespeichert
4. **Backend (auth.controller.ts)**: Liest `req.rememberMe` und setzt entsprechend lange Token-Laufzeiten:
   - ✅ **Mit "Eingeloggt bleiben"**: Access Token 7 Tage, Refresh Token 30 Tage
   - ❌ **Ohne "Eingeloggt bleiben"**: Access Token 1 Stunde, Refresh Token 7 Tage

## UI Verbesserungen:
- Checkbox ist jetzt zentriert und stylischer gestaltet
- Schöner grauer Container mit Hover-Effekt
- Border mit Primary-Color Hover
- Besseres Spacing

## Geänderte Dateien:

### Frontend:
1. **`apps/web/src/pages/LoginPage.tsx`**:
   - Speichert `rememberMe` in localStorage
   - UI verbessert: zentriert, stylischer Container

2. **`apps/web/src/stores/auth.ts`**:
   - Liest `rememberMe` aus localStorage
   - Übergibt als `state` Parameter an Discord OAuth

### Backend:
3. **`apps/api/src/auth/strategies/discord.strategy.ts`**:
   - `passReqToCallback: true` aktiviert
   - Liest `state` Parameter und speichert in `req.rememberMe`

4. **`apps/api/src/auth/auth.controller.ts`**:
   - Liest `req.rememberMe` (statt Cookie)
   - Setzt entsprechend lange Token-Laufzeiten
   - Cookie-Ansatz entfernt

## Deployment:
```bash
cd /var/www/vhosts/lsc-nc.de/crc-ws
docker compose -f docker-compose.prod.yml up --build -d
```

## Test nach Deployment:
1. Auf Login-Seite gehen
2. "Eingeloggt bleiben (7 Tage)" aktivieren (ist standardmäßig aktiviert)
3. Mit Discord anmelden
4. In Browser DevTools → Application → Cookies → lsc-nc.de prüfen:
   - `access_token` sollte Expiry-Datum in **7 Tagen** haben
   - `refresh_token` sollte Expiry-Datum in **30 Tagen** haben

Wenn Checkbox **nicht** aktiviert:
   - `access_token` sollte Expiry-Datum in **1 Stunde** haben
   - `refresh_token` sollte Expiry-Datum in **7 Tagen** haben

