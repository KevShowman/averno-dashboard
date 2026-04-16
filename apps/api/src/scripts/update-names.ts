import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateNames() {
  console.log('🔄 Aktualisiere Artikel-Namen...');

  try {
    // Update item names to match the seed file
    const updates = [
      { sku: 'WPN-50CAL', name: '.50 Kaliber' },
      { sku: 'WPN-HEAVY-PISTOL', name: 'Schwere Pistole' },
      { sku: 'WPN-ADV-RIFLE', name: 'Advanced Gewehr' },
      { sku: 'EQUIP-BAGS', name: 'Säcke' },
      { sku: 'AMMO-UNIVERSAL', name: 'Munition' },
    ];

    for (const update of updates) {
      const result = await prisma.item.updateMany({
        where: { sku: update.sku },
        data: { name: update.name },
      });
      if (result.count > 0) {
        console.log(`✅ Updated ${update.sku} to "${update.name}"`);
      }
    }

    console.log('🎉 Namen-Update abgeschlossen!');

  } catch (error) {
    console.error('❌ Fehler beim Update:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateNames();

