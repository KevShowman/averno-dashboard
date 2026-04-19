import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateRolesTemp() {
  console.log('🔄 Migriere Benutzerrollen zum neuen System (temporär)...');

  try {
    // Zuerst schauen wir was in der DB ist
    const allUsers = await prisma.user.findMany({
      select: { id: true, username: true, role: true }
    });

    console.log('📊 Aktuelle Benutzer in der Datenbank:');
    allUsers.forEach(user => {
      console.log(`   ${user.username}: ${user.role}`);
    });

    // Migration mapping mit RAW SQL um die Enum-Beschränkung zu umgehen
    const migrations = [
      { from: 'ADMIN', to: 'PATRON' },
      { from: 'QUARTIERMEISTER', to: 'DON' },
      { from: 'MITGLIED', to: 'CAPO' },
      { from: 'GAST', to: 'LINCE' },
    ];

    let totalUpdated = 0;

    for (const migration of migrations) {
      // Benutzer mit dieser Rolle finden
      const usersWithRole = allUsers.filter(u => u.role === migration.from);
      
      if (usersWithRole.length > 0) {
        console.log(`🔄 Migriere ${usersWithRole.length} Benutzer von ${migration.from} zu ${migration.to}...`);
        
        // Jeden Benutzer einzeln mit RAW SQL updaten
        for (const user of usersWithRole) {
          await prisma.$executeRaw`
            UPDATE "users" 
            SET "role" = ${migration.to}::text 
            WHERE "id" = ${user.id}
          `;
          console.log(`   ✅ ${user.username}: ${migration.from} → ${migration.to}`);
          totalUpdated++;
        }
      }
    }

    console.log(`🎉 Migration abgeschlossen! ${totalUpdated} Benutzer insgesamt aktualisiert.`);

    // Nochmal prüfen
    const updatedUsers = await prisma.user.findMany({
      select: { username: true, role: true }
    });

    console.log('\n📊 Benutzer nach Migration:');
    updatedUsers.forEach(user => {
      console.log(`   ${user.username}: ${user.role}`);
    });

  } catch (error) {
    console.error('❌ Fehler bei der Migration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrateRolesTemp();

