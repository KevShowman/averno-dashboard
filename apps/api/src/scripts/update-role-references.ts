import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

/**
 * Script zum Aktualisieren aller Role.DON und Role.ASESOR Referenzen
 * auf die neuen Leaderschaft-Rollen
 */

async function updateRoleReferences() {
  console.log('🔄 Starte Aktualisierung der Rollen-Referenzen...\n');

  // Finde alle TypeScript-Dateien im src Verzeichnis
  const files = await glob('src/**/*.ts', {
    ignore: ['src/**/*.spec.ts', 'src/**/*.test.ts', 'src/scripts/update-role-references.ts'],
    absolute: true,
  });

  let totalFiles = 0;
  let totalReplacements = 0;

  for (const file of files) {
    const relativePath = path.relative(process.cwd(), file);
    let content = fs.readFileSync(file, 'utf8');
    let fileChanged = false;
    let fileReplacements = 0;

    // Ersetze Role.DON (nicht gefolgt von _) mit den beiden Don-Rollen
    // Muster: @Roles(..., Role.DON, ...) -> @Roles(..., Role.DON_CAPITAN, Role.DON_COMANDANTE, ...)
    const donPattern = /Role\.DON(?![_])/g;
    if (donPattern.test(content)) {
      content = content.replace(/Role\.DON(?![_])/g, (match, offset) => {
        fileChanged = true;
        fileReplacements++;
        return 'Role.DON_CAPITAN, Role.DON_COMANDANTE';
      });
    }

    // Ersetze Role.ASESOR mit Role.EL_MANO_DERECHA
    const asesorPattern = /Role\.ASESOR/g;
    if (asesorPattern.test(content)) {
      content = content.replace(/Role\.ASESOR/g, (match) => {
        fileChanged = true;
        fileReplacements++;
        return 'Role.EL_MANO_DERECHA';
      });
    }

    if (fileChanged) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`✅ ${relativePath}: ${fileReplacements} Ersetzungen`);
      totalFiles++;
      totalReplacements += fileReplacements;
    }
  }

  console.log(`\n🎉 Fertig! ${totalReplacements} Ersetzungen in ${totalFiles} Dateien.`);
}

updateRoleReferences()
  .then(() => {
    console.log('\n✅ Alle Rollen-Referenzen wurden aktualisiert.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fehler beim Aktualisieren der Rollen-Referenzen:', error);
    process.exit(1);
  });

