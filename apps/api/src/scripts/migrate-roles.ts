import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateRoles() {
  console.log('🔄 Migriere Benutzerrollen zum neuen System...');

  try {
    // Migration mapping
    const roleMigration = [
      { from: 'ADMIN', to: 'PATRON' },
      { from: 'QUARTIERMEISTER', to: 'DON' },
      { from: 'MITGLIED', to: 'CAPO' },
      { from: 'GAST', to: 'LINCE' },
    ];

    let totalUpdated = 0;

    for (const migration of roleMigration) {
      try {
        const result = await prisma.user.updateMany({
          where: { role: migration.from as any },
          data: { role: migration.to as any },
        });
        
        if (result.count > 0) {
          console.log(`✅ ${result.count} Benutzer von ${migration.from} zu ${migration.to} migriert`);
          totalUpdated += result.count;
        }
      } catch (error) {
        console.log(`ℹ️  Rolle ${migration.from} existiert nicht mehr, überspringe...`);
      }
    }

    console.log(`🎉 Migration abgeschlossen! ${totalUpdated} Benutzer insgesamt aktualisiert.`);

    // Zeige aktuelle Rollen-Verteilung
    const roleStats = await prisma.user.groupBy({
      by: ['role'],
      _count: { role: true },
    });

    console.log('\n📊 Aktuelle Rollen-Verteilung:');
    roleStats.forEach(stat => {
      const displayName = {
        'PATRON': 'Patron',
        'DON': 'Don',
        'CAPO': 'Capo',
        'LINCE': 'Lince'
      }[stat.role] || stat.role;
      
      console.log(`   ${displayName}: ${stat._count.role} Benutzer`);
    });

  } catch (error) {
    console.error('❌ Fehler bei der Migration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrateRoles();

