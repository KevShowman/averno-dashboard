import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function setupDiscordRoles() {
  try {
    console.log('🚀 Richte Discord-Rollen-Mappings ein...');

    // Discord-Rollen-Mappings definieren
    const roleMappings = [
      {
        discordRoleId: '1402760679613661224', // El Patron
        systemRole: Role.EL_PATRON,
        name: 'El Patron'
      },
      {
        discordRoleId: '1402760800216551494', // Don
        systemRole: Role.DON,
        name: 'Don'
      },
      {
        discordRoleId: '1402760888561438862', // Asesor
        systemRole: Role.ASESOR,
        name: 'Asesor'
      },
      {
        discordRoleId: '1402760961097470025', // Inspector
        systemRole: Role.ROUTENVERWALTUNG, // Inspector wird als Routenverwaltung gemappt
        name: 'Inspector'
      },
      {
        discordRoleId: '1402761049568051331', // Routenverwaltung
        systemRole: Role.ROUTENVERWALTUNG,
        name: 'Routenverwaltung'
      },
      {
        discordRoleId: '1402761676851511356', // Sicario
        systemRole: Role.SICARIO,
        name: 'Sicario'
      },
      {
        discordRoleId: '1402760263341707275', // Soldado
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
