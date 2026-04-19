import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

// Standard Discord-Rollen (müssen an euren Discord-Server angepasst werden!)
const DEFAULT_MAPPINGS = [
  {
    discordRoleId: '1431388062427906227', // Futuro
    systemRole: Role.FUTURO,
    name: 'Futuro',
  },
  // Weitere Rollen müssen hier hinzugefügt werden
  // Beispiel:
  // {
  //   discordRoleId: 'DISCORD_ROLE_ID_HIER',
  //   systemRole: Role.CAPO,
  //   name: 'Capo',
  // },
];

async function fixDiscordMappings() {
  try {
    console.log('🔧 Prüfe und repariere Discord-Rollen-Mappings...\n');

    const existingMappings = await prisma.discordRoleMapping.findMany();
    console.log(`📊 Vorhandene Mappings: ${existingMappings.length}\n`);

    if (existingMappings.length === 0) {
      console.log('🚨 WARNUNG: Keine Mappings vorhanden!');
      console.log('💡 Du musst die Discord-Rollen manuell über die Einstellungs-Seite konfigurieren!\n');
      console.log('📍 Gehe zu: Einstellungen → Discord-Rollen-Synchronisation\n');
    } else {
      // Reaktiviere alle deaktivierten Mappings
      const deactivatedMappings = existingMappings.filter(m => !m.isActive);
      
      if (deactivatedMappings.length > 0) {
        console.log(`🔄 Reaktiviere ${deactivatedMappings.length} deaktivierte Mappings...\n`);
        
        for (const mapping of deactivatedMappings) {
          await prisma.discordRoleMapping.update({
            where: { id: mapping.id },
            data: { isActive: true }
          });
          console.log(`✅ Aktiviert: ${mapping.name} (${mapping.systemRole})`);
        }
      } else {
        console.log('✅ Alle Mappings sind bereits aktiv!\n');
      }

      // Zeige alle aktiven Mappings
      const activeMappings = await prisma.discordRoleMapping.findMany({
        where: { isActive: true }
      });

      console.log(`\n📋 Aktive Mappings (${activeMappings.length}):\n`);
      activeMappings.forEach(mapping => {
        console.log(`✅ ${mapping.name.padEnd(20)} | ${mapping.systemRole.padEnd(20)} | Discord ID: ${mapping.discordRoleId}`);
      });
    }

    console.log('\n✅ Fertig!');

  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDiscordMappings();

