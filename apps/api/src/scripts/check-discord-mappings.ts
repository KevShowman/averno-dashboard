import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDiscordMappings() {
  try {
    console.log('🔍 Checke Discord-Rollen-Mappings...\n');

    const allMappings = await prisma.discordRoleMapping.findMany({
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📊 Gesamt Mappings: ${allMappings.length}`);
    console.log(`✅ Aktive Mappings: ${allMappings.filter(m => m.isActive).length}`);
    console.log(`❌ Deaktivierte Mappings: ${allMappings.filter(m => !m.isActive).length}\n`);

    if (allMappings.length === 0) {
      console.log('🚨 PROBLEM: Keine Discord-Rollen-Mappings vorhanden!');
      console.log('   → Niemand kann sich einloggen!\n');
      console.log('💡 Lösung: Discord-Rollen-Mappings in den Einstellungen erstellen!\n');
    } else {
      console.log('📋 Alle Mappings:\n');
      allMappings.forEach(mapping => {
        const status = mapping.isActive ? '✅ AKTIV' : '❌ DEAKTIVIERT';
        console.log(`${status} | ${mapping.name.padEnd(20)} | ${mapping.systemRole.padEnd(20)} | Discord ID: ${mapping.discordRoleId}`);
      });

      if (allMappings.filter(m => m.isActive).length === 0) {
        console.log('\n🚨 PROBLEM: Alle Mappings sind deaktiviert!');
        console.log('   → Niemand kann sich einloggen!\n');
      }
    }

    console.log('\n💡 Tipp: Gehe zu Einstellungen → Discord-Rollen-Synchronisation');

  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDiscordMappings();

