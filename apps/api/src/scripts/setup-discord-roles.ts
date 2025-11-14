import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function setupDiscordRoles() {
  try {
    console.log('🚀 Richte Discord-Rollen-Mappings ein...');

    // Discord-Rollen-Mappings definieren
    const roleMappings = [
      {
        discordRoleId: '1431388062474309701', // El Patron
        systemRole: Role.EL_PATRON,
        name: 'El Patron'
      },
      {
        discordRoleId: '1431388062474309699', // Don
        systemRole: Role.DON_CAPITAN,
        name: 'Don'
      },
      {
        discordRoleId: '1431388062474309698', // Asesor
        systemRole: Role.EL_MANO_DERECHA,
        name: 'Asesor'
      },
      {
        discordRoleId: '1431388062474309697', // Inspector
        systemRole: Role.ROUTENVERWALTUNG, // Inspector wird als Routenverwaltung gemappt
        name: 'Inspector'
      },
      {
        discordRoleId: '1431388062449139715', // Routenverwaltung
        systemRole: Role.ROUTENVERWALTUNG,
        name: 'Routenverwaltung'
      },
      {
        discordRoleId: '1431388062449139716', // Sicario
        systemRole: Role.SICARIO,
        name: 'Sicario'
      },
      {
        discordRoleId: '1431388062427906220', // Soldado
        systemRole: Role.SOLDADO,
        name: 'Soldado'
      }
    ];

    // Rollen-Mappings erstellen oder aktualisieren
    for (const mapping of roleMappings) {
      const existing = await prisma.discordRoleMapping.findUnique({
        where: { discordRoleId: mapping.discordRoleId }
      });

      if (existing) {
        // Aktualisieren falls sich etwas geändert hat
        await prisma.discordRoleMapping.update({
          where: { discordRoleId: mapping.discordRoleId },
          data: {
            systemRole: mapping.systemRole,
            name: mapping.name,
            isActive: true
          }
        });
        console.log(`✅ Mapping aktualisiert: ${mapping.name} (${mapping.discordRoleId}) -> ${mapping.systemRole}`);
      } else {
        // Neu erstellen
        await prisma.discordRoleMapping.create({
          data: {
            discordRoleId: mapping.discordRoleId,
            systemRole: mapping.systemRole,
            name: mapping.name,
            isActive: true
          }
        });
        console.log(`✅ Mapping erstellt: ${mapping.name} (${mapping.discordRoleId}) -> ${mapping.systemRole}`);
      }
    }

    console.log('🎉 Discord-Rollen-Mappings erfolgreich eingerichtet!');
    
    // Zusammenfassung anzeigen
    const allMappings = await prisma.discordRoleMapping.findMany({
      orderBy: {
        systemRole: 'asc'
      }
    });

    console.log('\n📋 Aktuelle Discord-Rollen-Mappings:');
    allMappings.forEach(mapping => {
      console.log(`  • ${mapping.name} (${mapping.discordRoleId}) -> ${mapping.systemRole}`);
    });

    console.log('\n🔒 Nur Benutzer mit diesen Discord-Rollen können sich anmelden!');

  } catch (error) {
    console.error('❌ Fehler beim Einrichten der Discord-Rollen:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Script ausführen
setupDiscordRoles();
