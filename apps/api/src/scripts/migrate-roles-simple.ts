import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateRolesSimple() {
  console.log('🔄 Migriere Benutzerrollen zum neuen System...');

  try {
    // Zuerst schauen wir was in der DB ist
    const allUsers = await prisma.user.findMany({
      select: { id: true, username: true, role: true }
    });

    console.log('📊 Aktuelle Benutzer in der Datenbank:');
    allUsers.forEach(user => {
      console.log(`   ${user.username}: ${user.role}`);
    });

    // Migration mapping mit normalen Prisma Updates
    const migrations = [
      { from: Role.ADMIN, to: Role.EL_PATRON },
      { from: Role.QUARTIERMEISTER, to: Role.DON },
      { from: Role.MITGLIED, to: Role.ASESOR },
      { from: Role.GAST, to: Role.SOLDADO },
    ];

    let totalUpdated = 0;

    for (const migration of migrations) {
      // Benutzer mit dieser Rolle finden und updaten
      const result = await prisma.user.updateMany({
        where: { role: migration.from },
        data: { role: migration.to },
      });
      
      if (result.count > 0) {
        console.log(`✅ ${result.count} Benutzer von ${migration.from} zu ${migration.to} migriert`);
        totalUpdated += result.count;
      }
    }

    console.log(`🎉 Migration abgeschlossen! ${totalUpdated} Benutzer insgesamt aktualisiert.`);

    // Nochmal prüfen
    const updatedUsers = await prisma.user.findMany({
      select: { username: true, role: true }
    });

    console.log('\n📊 Benutzer nach Migration:');
    updatedUsers.forEach(user => {
      const displayName = {
        'EL_PATRON': 'El Patrón',
        'DON': 'Don',
        'ASESOR': 'Asesor',
        'SOLDADO': 'Soldado'
      }[user.role] || user.role;
      
      console.log(`   ${user.username}: ${displayName}`);
    });

  } catch (error) {
    console.error('❌ Fehler bei der Migration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrateRolesSimple();

