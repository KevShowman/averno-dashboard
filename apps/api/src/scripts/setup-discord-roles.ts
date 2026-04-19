import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function setupDiscordRoles() {
  try {
    console.log('🚀 Richte Discord-Rollen-Mappings ein...');

    // Discord-Rollen-Mappings definieren (12 Hauptrollen)
    const roleMappings = [
      // Leaderschaft
      {
        discordRoleId: '1431388062474309701', // 👑 - 12 | Patron
        systemRole: Role.PATRON,
        name: '12 | Patron'
      },
      {
        discordRoleId: '1431388062474309699', // 🔥 - 11 | Don
        systemRole: Role.DON,
        name: '11 | Don'
      },
      {
        discordRoleId: '1438638866432135348', // 🛡️ - 10 | Capo
        systemRole: Role.CAPO,
        name: '10 | Capo'
      },
      // Ränge 7-9
      {
        discordRoleId: '1431388062427906229', // 🔒 - 9 | Consultora
        systemRole: Role.CONSULTORA,
        name: '9 | Consultora'
      },
      {
        discordRoleId: '1438641189372035092', // 📚 - 8 | Padrino
        systemRole: Role.PADRINO,
        name: '8 | Padrino'
      },
      {
        discordRoleId: '1438641369038979295', // 🧰 - 7 | Gestión de Rutas
        systemRole: Role.GESTION_DE_RUTAS,
        name: '7 | Gestión de Rutas'
      },
      // Ränge 4-6
      {
        discordRoleId: '1438637584975921286', // ⭐ - 6 | El Mudo
        systemRole: Role.EL_MUDO,
        name: '6 | El Mudo'
      },
      {
        discordRoleId: '1431388062427906228', // ⚔️ - 5 | Lince
        systemRole: Role.LINCE,
        name: '5 | Lince'
      },
      {
        discordRoleId: '1438642330532839596', // 🐍 - 4 | Capataz
        systemRole: Role.CAPATAZ,
        name: '4 | Capataz'
      },
      // Ränge 1-3
      {
        discordRoleId: '1438641614481264743', // 🫢 - 3 | Mercader
        systemRole: Role.MERCADER,
        name: '3 | Mercader'
      },
      {
        discordRoleId: '1438639256275914752', // 🐢 - 2 | Coyote
        systemRole: Role.COYOTE,
        name: '2 | Coyote'
      },
      {
        discordRoleId: '1438636794181718199', // 🌱 - 1 | Recluta
        systemRole: Role.RECLUTA,
        name: '1 | Recluta'
      },
      // Legacy/Spezialrollen (falls noch im Discord vorhanden)
      {
        discordRoleId: '1431388062474309697', // Inspector
        systemRole: Role.ROUTENVERWALTUNG,
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
