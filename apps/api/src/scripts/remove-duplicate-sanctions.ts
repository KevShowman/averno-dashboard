import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function removeDuplicateSanctions() {
  console.log('🧹 Entferne Duplikat-Sanktionen...\n');
  console.log('⚠️  ACHTUNG: Dieses Script behält nur die NEUESTE Sanktion pro User und Kategorie!\n');

  // Gruppiere nach userId und category, finde Duplikate
  const duplicates = await prisma.$queryRaw<any[]>`
    SELECT 
      userId, 
      category, 
      COUNT(*) as count,
      GROUP_CONCAT(id ORDER BY createdAt DESC) as sanctionIds
    FROM sanctions
    WHERE status = 'ACTIVE'
    GROUP BY userId, category
    HAVING count > 1
    ORDER BY count DESC
  `;

  if (duplicates.length === 0) {
    console.log('✅ Keine Duplikate zum Entfernen gefunden!');
    return;
  }

  console.log(`⚠️ ${duplicates.length} Gruppen von Duplikaten gefunden\n`);

  let removedCount = 0;

  for (const dup of duplicates) {
    const ids = dup.sanctionIds.split(',');
    const newestId = ids[0]; // Erste ID ist die neueste (ORDER BY createdAt DESC)
    const idsToRemove = ids.slice(1); // Alle außer der neuesten

    const user = await prisma.user.findUnique({
      where: { id: dup.userId },
      select: { username: true },
    });

    console.log(`User: ${user?.username}`);
    console.log(`  Kategorie: ${dup.category}`);
    console.log(`  Behalte: ${newestId}`);
    console.log(`  Entferne: ${idsToRemove.join(', ')}`);

    // Setze alte Sanktionen auf CANCELLED
    for (const id of idsToRemove) {
      await prisma.sanction.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          updatedAt: new Date(),
        },
      });
      removedCount++;
    }

    console.log(`  ✅ ${idsToRemove.length} Duplikate entfernt\n`);
  }

  console.log(`\n✅ Insgesamt ${removedCount} Duplikate als CANCELLED markiert`);
}

removeDuplicateSanctions()
  .then(() => {
    console.log('\n✅ Fertig!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fehler:', error);
    process.exit(1);
  });

