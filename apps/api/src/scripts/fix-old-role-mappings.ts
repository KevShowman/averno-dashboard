import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function fixOldRoleMappings() {
  console.log('🔧 Starte Bereinigung der alten Rollen-Mappings...\n');

  try {
    // 1. Hole alle discord_role_mappings
    const allMappings = await prisma.$queryRaw<any[]>`
      SELECT id, discordRoleId, systemRole, name FROM discord_role_mappings
    `;

    console.log(`📊 Gefundene Mappings: ${allMappings.length}\n`);

    // 2. Identifiziere problematische Mappings
    const validRoles = Object.values(Role);
    const invalidMappings = allMappings.filter(
      m => !validRoles.includes(m.systemRole as Role)
    );

    console.log(`❌ Ungültige Mappings: ${invalidMappings.length}`);
    invalidMappings.forEach(m => {
      console.log(`  - ID: ${m.id}, Role: "${m.systemRole}", Name: ${m.name}`);
    });
    console.log('');

    // 3. Aktualisiere alte DON_CAPITAN Mappings zu DON
    const donUpdated = await prisma.$executeRaw`
      UPDATE discord_role_mappings 
      SET systemRole = 'DON' 
      WHERE systemRole = 'DON_CAPITAN'
    `;
    console.log(`✅ Aktualisiert DON_CAPITAN → DON: ${donUpdated} Mappings`);

    // 4. Aktualisiere alte CAPO Mappings zu CAPO
    const asesorUpdated = await prisma.$executeRaw`
      UPDATE discord_role_mappings 
      SET systemRole = 'CAPO' 
      WHERE systemRole IN ('DON_COMANDANTE', 'EL_MANO_DERECHA', 'ASESOR')
    `;
    console.log(`✅ Aktualisiert DON_COMANDANTE/EL_MANO_DERECHA/ASESOR → CAPO: ${asesorUpdated} Mappings`);

    // 5. Lösche leere oder NULL Mappings
    const emptyDeleted = await prisma.$executeRaw`
      DELETE FROM discord_role_mappings 
      WHERE systemRole = '' OR systemRole IS NULL
    `;
    console.log(`✅ Gelöscht leere Mappings: ${emptyDeleted}`);

    // 6. Lösche alle verbleibenden ungültigen Mappings
    const remainingInvalid = await prisma.$executeRaw`
      DELETE FROM discord_role_mappings 
      WHERE systemRole NOT IN (
        'ADMIN', 'QUARTIERMEISTER', 'MITGLIED', 'GAST',
        'PATRON', 'DON', 'CAPO',
        'CONSULTORA', 'PADRINO', 'GESTION_DE_RUTAS', 'EL_MUDO',
        'LINCE', 'CAPATAZ', 'MERCADER', 'COYOTE', 'RECLUTA',
        'ROUTENVERWALTUNG', 'LOGISTICA', 'SICARIO', 'FUTURO'
      )
    `;
    console.log(`✅ Gelöscht verbleibende ungültige Mappings: ${remainingInvalid}`);

    console.log('\n📋 Aktualisiere User-Rollen...\n');

    // 7. Aktualisiere User mit alten Rollen
    const userDonUpdated = await prisma.$executeRaw`
      UPDATE users 
      SET role = 'DON' 
      WHERE role = 'DON_CAPITAN'
    `;
    console.log(`✅ Aktualisiert User DON_CAPITAN → DON: ${userDonUpdated} Users`);

    const userCapoUpdated = await prisma.$executeRaw`
      UPDATE users 
      SET role = 'CAPO' 
      WHERE role IN ('DON_COMANDANTE', 'EL_MANO_DERECHA', 'ASESOR')
    `;
    console.log(`✅ Aktualisiert User DON_COMANDANTE/EL_MANO_DERECHA/ASESOR → CAPO: ${userCapoUpdated} Users`);

    console.log('\n🎉 Bereinigung abgeschlossen!');
    console.log('\n📊 Verbleibende Mappings:');

    const finalMappings = await prisma.discordRoleMapping.findMany({
      select: {
        id: true,
        name: true,
        systemRole: true,
        isActive: true,
      },
    });

    finalMappings.forEach(m => {
      console.log(`  ✓ ${m.name} → ${m.systemRole} (Active: ${m.isActive})`);
    });

    console.log(`\nℹ️  Hinweis: User sollten sich neu einloggen, um ihre Rollen zu aktualisieren.`);

  } catch (error) {
    console.error('❌ Fehler bei der Bereinigung:', error);
    throw error;
  }
}

fixOldRoleMappings()
  .then(() => {
    console.log('\n✅ Script erfolgreich ausgeführt');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script fehlgeschlagen:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
