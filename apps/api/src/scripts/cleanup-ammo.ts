import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupAmmo() {
  console.log('🧹 Bereinige alte Munitions-Items...');

  try {
    // Lösche alte Munitions-Items (außer dem Universal-Item)
    const deleted = await prisma.item.deleteMany({
      where: {
        sku: {
          in: ['AMMO-50CAL', 'AMMO-RIFLE', 'AMMO-PISTOL']
        }
      }
    });

    console.log(`✅ ${deleted.count} alte Munitions-Items gelöscht`);

    // Aktualisiere das Universal-Item
    const updatedAmmo = await prisma.item.updateMany({
      where: { sku: 'AMMO-UNIVERSAL' },
      data: { 
        name: 'Munition',
        minStock: 500,
        tags: ['munition', 'universal']
      }
    });

    if (updatedAmmo.count > 0) {
      console.log('✅ Universal-Munition aktualisiert');
    }

    console.log('🎉 Munitions-Bereinigung abgeschlossen!');

  } catch (error) {
    console.error('❌ Fehler bei der Bereinigung:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupAmmo();
