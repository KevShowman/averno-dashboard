import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('💊 Füge LSD zum Lagersystem hinzu...');

  // 1. Erstelle/finde die Kategorie "Drogen"
  const drogenCategory = await prisma.itemCategory.upsert({
    where: { name: 'Drogen' },
    update: {},
    create: {
      name: 'Drogen',
    },
  });

  console.log('✅ Kategorie "Drogen" erstellt/gefunden:', drogenCategory.id);

  // 2. Erstelle das Item "LSD"
  const lsdItem = await prisma.item.upsert({
    where: { sku: 'DRUG-LSD' },
    update: {
      name: 'LSD',
      categoryId: drogenCategory.id,
      minStock: 0,
      tags: ['drogen', 'lsd', 'rauschmittel'],
    },
    create: {
      name: 'LSD',
      sku: 'DRUG-LSD',
      categoryId: drogenCategory.id,
      minStock: 0,
      currentStock: 0,
      reservedStock: 0,
      tags: ['drogen', 'lsd', 'rauschmittel'],
      location: null,
    },
  });

  console.log('✅ LSD Item erstellt/aktualisiert:', lsdItem);

  console.log('🎉 LSD erfolgreich zum Lagersystem hinzugefügt!');
}

main()
  .catch((e) => {
    console.error('❌ Fehler beim Hinzufügen von LSD:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

