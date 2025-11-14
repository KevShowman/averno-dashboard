# Manuelle Fixes erforderlich

Es gibt noch einige Stellen im Code, die manuell aktualisiert werden müssen. Bitte führen Sie folgende Änderungen durch:

## 1. apps/api/src/discord/discord.service.ts

Suchen Sie nach **zwei** Vorkommen der alten Role-Hierarchie und ersetzen Sie sie:

### Erste Stelle (ca. Zeile 207-216):
```typescript
const roleHierarchy = {
  [Role.FUTURO]: 0,
  [Role.SOLDADO]: 1,
  [Role.SICARIO]: 2,
  [Role.ROUTENVERWALTUNG]: 3,
  [Role.ASESOR]: 4,  // <-- LÖSCHEN
  [Role.LOGISTICA]: 5,
  [Role.DON]: 6,  // <-- LÖSCHEN
  [Role.EL_PATRON]: 7,
};
```

**Ersetzen mit:**
```typescript
const roleHierarchy = {
  // Legacy-Rollen
  [Role.FUTURO]: 0,
  // Neue Ränge (1-9)
  [Role.EL_NOVATO]: 1,
  [Role.EL_PROTECTOR]: 2,
  [Role.EL_CONFIDENTE]: 3,
  [Role.EL_PREFECTO]: 4,
  [Role.SOLDADO]: 5,
  [Role.EL_TENIENTE]: 6,
  [Role.EL_ENCARGADO]: 7,
  [Role.EL_MENTOR]: 8,
  [Role.EL_CUSTODIO]: 9,
  // Legacy erweiterte Rollen
  [Role.SICARIO]: 10,
  [Role.ROUTENVERWALTUNG]: 11,
  [Role.LOGISTICA]: 12,
  // Leaderschaft
  [Role.EL_MANO_DERECHA]: 13,
  [Role.DON_COMANDANTE]: 14,
  [Role.DON_CAPITAN]: 15,
  [Role.EL_PATRON]: 16,
};
```

### Zweite Stelle (ca. Zeile 336-344):
**Gleiche Änderung wie oben**

## 2. apps/api/src/items/items.controller.ts

Suchen Sie nach Zeile 141:
```typescript
@Roles(Role.EL_PATRON, Role.LOGISTICA, Role.DON) // Temporär: Don kann auch ablehnen
```

**Ersetzen mit:**
```typescript
@Roles(Role.EL_PATRON, Role.LOGISTICA, Role.DON_CAPITAN, Role.DON_COMANDANTE) // Temporär: Don kann auch ablehnen
```

## 3. apps/api/src/users/users.service.ts

Suchen Sie nach Zeilen 247-248:
```typescript
{ key: Role.DON, name: 'Don', description: 'Zweithöchste Autorität' },
{ key: Role.ASESOR, name: 'Asesor', description: 'Berater und Führung' },
```

**LÖSCHEN** (diese wurden bereits durch neue Rollen ersetzt)

## 4. Scripts (Optional - nur für Legacy-Migration)

Die Fehler in `apps/api/src/scripts/migrate-roles-simple.ts` und `apps/api/src/scripts/setup-discord-roles.ts` können ignoriert werden, da diese Scripts nur für die initiale Migration verwendet wurden.

## Nach den manuellen Fixes:

1. Prisma Client neu generieren:
   ```bash
   cd apps/api
   npx prisma generate
   ```

2. TypeScript-Fehler prüfen:
   ```bash
   npx tsc --noEmit
   ```

3. Build ausführen:
   ```bash
   npm run build
   ```

4. Migration erstellen und ausführen:
   ```bash
   npx prisma migrate dev --name add_new_ranks_and_clothing_system
   ```

5. Seed ausführen:
   ```bash
   npm run prisma:seed
   ```

