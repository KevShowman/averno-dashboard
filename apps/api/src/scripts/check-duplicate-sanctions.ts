import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDuplicateSanctions() {
  console.log('🔍 Prüfe auf Duplikat-Sanktionen...\n');

  // Gruppiere nach userId und category, zähle wie viele es gibt
  const duplicates = await prisma.$queryRaw<any[]>`
    SELECT 
      userId, 
      category, 
      COUNT(*) as count,
      GROUP_CONCAT(id) as sanctionIds,
      GROUP_CONCAT(status) as statuses,
      GROUP_CONCAT(level) as levels
    FROM sanctions
    WHERE status = 'ACTIVE'
    GROUP BY userId, category
    HAVING count > 1
    ORDER BY count DESC
  `;

  if (duplicates.length === 0) {
    console.log('✅ Keine Duplikate gefunden!');
    return;
  }

  console.log(`⚠️ ${duplicates.length} potenzielle Duplikate gefunden:\n`);

  for (const dup of duplicates) {
    const user = await prisma.user.findUnique({
      where: { id: dup.userId },
      select: { username: true, icFirstName: true, icLastName: true },
    });

    console.log(`User: ${user?.username} (${user?.icFirstName} ${user?.icLastName})`);
    console.log(`  Kategorie: ${dup.category}`);
    console.log(`  Anzahl: ${dup.count}`);
    console.log(`  IDs: ${dup.sanctionIds}`);
    console.log(`  Levels: ${dup.levels}`);
    console.log(`  Status: ${dup.statuses}\n`);
  }

  // Zähle Gesamtzahl der doppelten Sanktionen
  const totalDuplicates = duplicates.reduce((sum, dup) => sum + (Number(dup.count) - 1), 0);
  console.log(`\n📊 Insgesamt ${totalDuplicates} überflüssige Sanktionen gefunden`);
  console.log('\n💡 Tipp: Verwende das Script remove-duplicate-sanctions.ts zum Entfernen');
}

checkDuplicateSanctions()
  .then(() => {
    console.log('\n✅ Fertig!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fehler:', error);
    process.exit(1);
  });

