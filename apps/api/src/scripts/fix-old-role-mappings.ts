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

    // 3. Aktualisiere alte DON Mappings zu DON_CAPITAN
    const donUpdated = await prisma.$executeRaw`
      UPDATE discord_role_mappings 
      SET systemRole = 'DON_CAPITAN' 
      WHERE systemRole = 'DON'
    `;
    console.log(`✅ Aktualisiert DON → DON_CAPITAN: ${donUpdated} Mappings`);

    // 4. Aktualisiere alte ASESOR Mappings zu EL_MANO_DERECHA
    const asesorUpdated = await prisma.$executeRaw`
      UPDATE discord_role_mappings 
      SET systemRole = 'EL_MANO_DERECHA' 
      WHERE systemRole = 'ASESOR'
    `;
    console.log(`✅ Aktualisiert ASESOR → EL_MANO_DERECHA: ${asesorUpdated} Mappings`);

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
        'EL_PATRON', 'DON_CAPITAN', 'DON_COMANDANTE', 'EL_MANO_DERECHA',
        'EL_CUSTODIO', 'EL_MENTOR', 'EL_ENCARGADO', 'EL_TENIENTE',
        'SOLDADO', 'EL_PREFECTO', 'EL_CONFIDENTE', 'EL_PROTECTOR', 'EL_NOVATO',
        'ROUTENVERWALTUNG', 'LOGISTICA', 'SICARIO', 'FUTURO'
      )
    `;
    console.log(`✅ Gelöscht verbleibende ungültige Mappings: ${remainingInvalid}`);

    console.log('\n📋 Aktualisiere User-Rollen...\n');

    // 7. Aktualisiere User mit alten Rollen
    const userDonUpdated = await prisma.$executeRaw`
      UPDATE users 
      SET role = 'DON_CAPITAN' 
      WHERE role = 'DON'
    `;
    console.log(`✅ Aktualisiert User DON → DON_CAPITAN: ${userDonUpdated} Users`);

    const userAsesorUpdated = await prisma.$executeRaw`
      UPDATE users 
      SET role = 'EL_MANO_DERECHA' 
      WHERE role = 'ASESOR'
    `;
    console.log(`✅ Aktualisiert User ASESOR → EL_MANO_DERECHA: ${userAsesorUpdated} Users`);

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

