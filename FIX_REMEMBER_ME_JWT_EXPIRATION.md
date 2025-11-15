# KRITISCHER FIX: "Eingeloggt bleiben" JWT-Token Expiration ✅

## ❌ **Das Problem:**
Obwohl die **Cookies** mit `maxAge` von 7 Tagen gesetzt wurden, waren die **JWT-Tokens selbst** nur 1 Stunde gültig!

### Root Cause:
1. `generateTokens()` wurde **ohne** `rememberMe` Parameter aufgerufen
2. Access Token wurde **immer** mit Standard-Expiration `1h` erstellt
3. Refresh Token hatte zwar `365d`, aber Access Token ablief nach 1h

**Resultat:** User musste sich nach 1 Stunde neu einloggen, obwohl Cookie noch da war!

## ✅ **Die Lösung:**

### 1. `auth.controller.ts`
- `generateTokens()` wird jetzt **MIT** `{ rememberMe }` Option aufgerufen
- Tokens werden VOR dem Cookie-Setzen generiert

### 2. `auth.service.ts`
- Access Token Expiration:
  - ✅ **Mit "Eingeloggt bleiben"**: `7d` (7 Tage)
  - ❌ **Ohne "Eingeloggt bleiben"**: `1h` (1 Stunde)
  
- Refresh Token Expiration:
  - ✅ **Mit "Eingeloggt bleiben"**: `30d` (30 Tage)
  - ❌ **Ohne "Eingeloggt bleiben"**: `7d` (7 Tage)

### Synchronisation:
```typescript
// JWT Token Expiration ↔ Cookie MaxAge
rememberMe = true:
  - Access Token:  7d  ↔ Cookie maxAge: 7 days
  - Refresh Token: 30d ↔ Cookie maxAge: 30 days

rememberMe = false:
  - Access Token:  1h  ↔ Cookie maxAge: 1 hour
  - Refresh Token: 7d  ↔ Cookie maxAge: 7 days
```

## 📝 **Geänderte Dateien:**

1. **`apps/api/src/auth/auth.controller.ts`**:
   - `generateTokens(user, { rememberMe })` - Parameter übergeben

2. **`apps/api/src/auth/auth.service.ts`**:
   - Access Token: `expiresIn: rememberMe ? '7d' : '1h'`
   - Refresh Token: `expiresIn: rememberMe ? '30d' : '7d'`

## 🚀 **Deployment:**

```bash
cd /var/www/vhosts/lsc-nc.de/crc-ws
docker compose -f docker-compose.prod.yml up --build -d
```

## ✅ **Test nach Deployment:**

1. **Login mit "Eingeloggt bleiben"**:
   - In Browser DevTools → Application → Cookies → lsc-nc.de
   - `access_token` Expiry: **7 Tage**
   - `refresh_token` Expiry: **30 Tage**
   - JWT Token selbst hat auch `exp` Claim für 7 Tage (can decode at jwt.io)

2. **Server-Neustart**:
   - User bleibt eingeloggt ✅
   - Kein Redirect zu Login ✅

3. **Nach 7 Tagen**:
   - Access Token abgelaufen → Automatic refresh mit Refresh Token
   - User bleibt noch 23 Tage eingeloggt ✅

## 🎯 **Vorher vs. Nachher:**

### ❌ Vorher:
- Cookie: 7 Tage valid
- JWT Token: 1 Stunde valid
- **Nach 1 Stunde:** Token abgelaufen → Login erforderlich
- **Problem:** Cookie war nutzlos!

### ✅ Nachher:
- Cookie: 7 Tage valid
- JWT Token: 7 Tage valid
- **Nach 7 Tagen:** Access Token abgelaufen → Refresh Token (30 Tage) wird verwendet
- **Nach 30 Tagen:** Login erforderlich
- **Server-Neustart:** User bleibt eingeloggt! 🎉

