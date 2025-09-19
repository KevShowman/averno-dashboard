import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create modules
  const lagerModule = await prisma.module.upsert({
    where: { key: 'lager' },
    update: {},
    create: {
      key: 'lager',
      name: 'Lagerverwaltung',
      enabled: true,
    },
  });

  const kasseModule = await prisma.module.upsert({
    where: { key: 'kasse' },
    update: {},
    create: {
      key: 'kasse',
      name: 'Kassensystem',
      enabled: true,
    },
  });

  console.log('✅ Modules created:', { lagerModule, kasseModule });

  // Create item categories
  const categories = [
    { name: 'Waffen' },
    { name: 'Munition' },
    { name: 'Ausrüstung' },
    { name: 'Medizin' },
    { name: 'Werkzeug' },
    { name: 'Zubehör' },
  ];

  const createdCategories = [];
  for (const category of categories) {
    const created = await prisma.itemCategory.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
    createdCategories.push(created);
  }

  console.log('✅ Categories created:', createdCategories.length);

  // Find categories for items
  const waffenCat = createdCategories.find(c => c.name === 'Waffen');
  const munitionCat = createdCategories.find(c => c.name === 'Munition');
  const ausruestungCat = createdCategories.find(c => c.name === 'Ausrüstung');
  const medizinCat = createdCategories.find(c => c.name === 'Medizin');
  const werkzeugCat = createdCategories.find(c => c.name === 'Werkzeug');
  const zubehoerCat = createdCategories.find(c => c.name === 'Zubehör');

  // Create items
  const items = [
    // Waffen
    { name: '.50 Kaliber', sku: 'WPN-50CAL', categoryId: waffenCat.id, minStock: 5, tags: ['pistole', 'kaliber50'] },
    { name: 'Pistole', sku: 'WPN-PISTOL', categoryId: waffenCat.id, minStock: 10, tags: ['pistole', 'standard'] },
    { name: 'Schwere Pistole', sku: 'WPN-HEAVY-PISTOL', categoryId: waffenCat.id, minStock: 5, tags: ['pistole', 'combat'] },
    { name: 'Advanced Gewehr', sku: 'WPN-ADV-RIFLE', categoryId: waffenCat.id, minStock: 3, tags: ['gewehr', 'sturm'] },
    { name: 'Spezialkarabiner', sku: 'WPN-SPEC-CARBINE', categoryId: waffenCat.id, minStock: 3, tags: ['karabiner', 'spezial'] },
    { name: 'Tommy Gun', sku: 'WPN-GUSENBERG', categoryId: waffenCat.id, minStock: 2, tags: ['tommy', 'automatik'] },
    { name: 'Karabiner', sku: 'WPN-CARBINE', categoryId: waffenCat.id, minStock: 5, tags: ['karabiner', 'standard'] },

    // Munition
    { name: 'Munition', sku: 'AMMO-UNIVERSAL', categoryId: munitionCat.id, minStock: 500, tags: ['munition', 'universal'] },

    // Ausrüstung
    { name: 'Westen', sku: 'ARMOR-VEST', categoryId: ausruestungCat.id, minStock: 15, tags: ['schutz', 'weste'] },
    { name: 'Säcke', sku: 'EQUIP-BAGS', categoryId: ausruestungCat.id, minStock: 20, tags: ['säcke', 'entführung'] },

    // Zubehör
    { name: 'Schalldämpfer', sku: 'ATT-SUPPRESSOR', categoryId: zubehoerCat.id, minStock: 10, tags: ['aufsatz', 'schalldämpfer'] },
    { name: 'Zielfernrohr', sku: 'ATT-SCOPE', categoryId: zubehoerCat.id, minStock: 8, tags: ['aufsatz', 'zielfernrohr'] },
    { name: 'Erweitertes Magazin', sku: 'ATT-EXT-MAG', categoryId: zubehoerCat.id, minStock: 15, tags: ['aufsatz', 'magazin'] },
    { name: 'Taschenlampe', sku: 'ATT-FLASHLIGHT', categoryId: zubehoerCat.id, minStock: 12, tags: ['aufsatz', 'licht'] },

    // Medizin
    { name: 'Medkits', sku: 'MED-MEDKIT', categoryId: medizinCat.id, minStock: 25, tags: ['medizin', 'heilung'] },

    // Werkzeug
    { name: 'Repairkits', sku: 'TOOL-REPAIR', categoryId: werkzeugCat.id, minStock: 15, tags: ['reparatur', 'werkzeug'] },
  ];

  const createdItems = [];
  for (const item of items) {
    const created = await prisma.item.upsert({
      where: { sku: item.sku },
      update: {},
      create: item,
    });
    createdItems.push(created);
  }

  console.log('✅ Items created:', createdItems.length);

  // Create settings
  await prisma.settings.upsert({
    where: { key: 'approval_threshold' },
    update: {},
    create: {
      key: 'approval_threshold',
      value: { amount: 100000 }, // 100k Schwarzgeld
    },
  });

  await prisma.settings.upsert({
    where: { key: 'app_config' },
    update: {},
    create: {
      key: 'app_config',
      value: {
        name: 'LaSanta Calavera',
        version: '1.0.0',
        theme: 'dark',
        colors: {
          primary: '#6A1F2B',
          secondary: '#16161A',
          accent: '#B08D57'
        }
      },
    },
  });

  console.log('✅ Settings created');

  console.log('🎉 Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
