# MySQL Migration - Code-Änderungen

## Übersicht

Die Anwendung wurde von PostgreSQL auf MySQL/MariaDB migriert. Dies erforderte Änderungen an Array-Feldern, da MySQL keine nativen Arrays unterstützt.

## Schema-Änderungen

### Betroffene Felder

| Modell | Feld | Alt (PostgreSQL) | Neu (MySQL) |
|--------|------|------------------|-------------|
| User | allRoles | `Role[]` | `Json @default("[]")` |
| User | discordRoles | `String[]` | `Json @default("[]")` |
| Item | tags | `String[]` | `Json @default("[]")` |

## Code-Änderungen

### 1. JSON zu Array konvertieren

**Problem**: JSON-Felder sind vom Typ `Prisma.JsonValue`, nicht Array.

**Lösung**: Immer zu Array casten:

```typescript
// ❌ FALSCH (PostgreSQL)
if (user.allRoles.includes(Role.EL_PATRON)) { ... }

// ✅ RICHTIG (MySQL)
const allRoles = Array.isArray(user.allRoles) ? user.allRoles as Role[] : [];
if (allRoles.includes(Role.EL_PATRON)) { ... }
```

### 2. Helper-Funktionen verwenden

Für konsistente Konvertierung gibt es Helper-Funktionen:

```typescript
import { jsonToRoleArray, userHasRole } from '../common/helpers/json-array.helper';

// Konvertierung
const allRoles = jsonToRoleArray(user.allRoles);

// Rolle prüfen
if (userHasRole(user, Role.EL_PATRON)) { ... }

// Mehrere Rollen prüfen
if (userHasAnyRole(user, [Role.EL_PATRON, Role.DON])) { ... }
```

### 3. Case-Insensitive Search

**Problem**: MySQL unterstützt `mode: 'insensitive'` nicht standardmäßig.

```typescript
// ❌ FALSCH (funktioniert nicht in MySQL)
where: {
  username: { contains: searchTerm, mode: 'insensitive' }
}

// ✅ RICHTIG (MySQL)
// Option 1: Lowercase in App
where: {
  username: { contains: searchTerm.toLowerCase() }
}

// Option 2: SQL COLLATION (wenn nötig)
// Collation muss in Datenbank konfiguriert sein
```

## Geänderte Dateien

### apps/api/src/discord/discord.service.ts
- Zeile 160-162: `allRoles` zu Array casten

### apps/api/src/items/items.service.ts
- Zeile 211-213: `allRoles` zu Array casten (isElPatronOrDon)
- Zeile 259-261: `allRoles` zu Array casten (isLeadership)

### apps/api/src/users/users.service.ts
- Zeile 139-141: `mode: 'insensitive'` entfernt
- Zeile 193-194: `allRoles` zu Array casten

### apps/api/src/common/helpers/json-array.helper.ts
- **NEU**: Helper-Funktionen für JSON-Array-Konvertierung

## Neue Dateien

```
apps/api/src/common/helpers/
└── json-array.helper.ts    // Helper für JSON-Array-Konvertierung
```

## Migration Checklist

- [x] Schema aktualisiert (arrays zu Json)
- [x] TypeScript-Fehler behoben
- [x] Helper-Funktionen erstellt
- [x] Case-insensitive Search angepasst
- [ ] Tests aktualisiert (falls vorhanden)
- [ ] Seed-Daten überprüft
- [ ] Alle Services durchsuchen nach `allRoles`, `discordRoles`, `tags`

## Bekannte Einschränkungen

1. **Case-Insensitive Search**: 
   - PostgreSQL: Nativ unterstützt mit `mode: 'insensitive'`
   - MySQL: Erfordert `.toLowerCase()` in der App oder Collation-Setup

2. **Array-Performance**:
   - PostgreSQL: Native Array-Operationen sind optimiert
   - MySQL: JSON-Operationen können langsamer sein bei großen Arrays

3. **Array-Queries**:
   - PostgreSQL: `{ contains: value }` für Arrays
   - MySQL: Komplexere JSON-Queries nötig

## Weitere Überlegungen

### Wenn neue Array-Felder hinzugefügt werden:

```prisma
// Schema
model Example {
  id       String   @id @default(cuid())
  items    Json     @default("[]")  // ← Nicht String[]!
}
```

```typescript
// Code
const items = Array.isArray(example.items) 
  ? example.items as string[] 
  : [];
```

### Performance-Optimierung

Für große Arrays oder häufige Queries:
- Erwägen Sie separate Tabellen mit Relations
- Verwenden Sie Indexes auf JSON-Felder (MySQL 5.7+)

## Troubleshooting

### TypeScript-Fehler: "Property 'includes' does not exist"

```typescript
// Fehler:
user.allRoles.includes(role)  // TS2339

// Fix:
const allRoles = Array.isArray(user.allRoles) ? user.allRoles as Role[] : [];
allRoles.includes(role)
```

### Runtime-Fehler: "allRoles is not iterable"

```typescript
// Fehler:
for (const role of user.allRoles) { ... }

// Fix:
const allRoles = jsonToRoleArray(user.allRoles);
for (const role of allRoles) { ... }
```

## Ressourcen

- [Prisma MySQL Dokumentation](https://www.prisma.io/docs/concepts/database-connectors/mysql)
- [MySQL JSON Functions](https://dev.mysql.com/doc/refman/8.0/en/json-functions.html)
- [Prisma Json Type](https://www.prisma.io/docs/concepts/components/prisma-schema/data-model#json)

## Autor & Datum

Migriert: 2025-10-29  
Version: 1.0.0

