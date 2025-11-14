# KRITISCH: discord.service.ts manuell beheben!

## Problem
Die Datei `apps/api/src/discord/discord.service.ts` hat unsaved changes im Editor, die noch alte Rollen-Referenzen (`Role.DON` und `Role.ASESOR`) enthalten.

## Lösung

### Option 1: Datei speichern und neu laden
1. Öffnen Sie `apps/api/src/discord/discord.service.ts` im Editor
2. **Speichern Sie die Datei** (Ctrl+S / Cmd+S)
3. **Laden Sie die Datei neu** aus der Festplatte
4. Überprüfen Sie, ob Zeilen 207-229 die neue Hierarchie haben

### Option 2: Manuelle Bearbeitung

**Suchen Sie nach ZWEI Stellen** in der Datei:

#### Stelle 1 (ca. Zeile 207-216):
```typescript
const roleHierarchy = {
  [Role.FUTURO]: 0,
  [Role.SOLDADO]: 1,
  [Role.SICARIO]: 2,
  [Role.ROUTENVERWALTUNG]: 3,
  [Role.ASESOR]: 4,          // ❌ DIESE ZEILE LÖSCHEN
  [Role.LOGISTICA]: 5,
  [Role.DON]: 6,              // ❌ DIESE ZEILE LÖSCHEN
  [Role.EL_PATRON]: 7,
};
```

**Ersetzen Sie komplett mit:**
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

#### Stelle 2 (ca. Zeile 336-344):
**Genau die gleiche Änderung!**

## Verifizierung

Nach dem Fix, führen Sie aus:
```bash
cd apps/api
grep -n "Role.ASESOR\|Role.DON[^_]" src/discord/discord.service.ts
```

Das sollte **KEINE Ergebnisse** mehr liefern (außer in Kommentaren).

## Dann Build testen:
```bash
cd apps/api
npx tsc --noEmit
```

Sollte keine Fehler mehr in `discord.service.ts` zeigen.

