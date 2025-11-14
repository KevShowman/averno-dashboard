import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function setupDiscordRoles() {
  try {
    console.log('🚀 Richte Discord-Rollen-Mappings ein...');

    // Discord-Rollen-Mappings definieren (neue 13 Ränge)
    const roleMappings = [
      // Leaderschaft
      {
        discordRoleId: '1431388062474309701', // 👑 - El Patrón
        systemRole: Role.EL_PATRON,
        name: 'El Patrón'
      },
      {
        discordRoleId: '1431388062474309699', // 🔥 - Don (El Capitán)
        systemRole: Role.DON_CAPITAN,
        name: 'Don - El Capitán'
      },
      {
        discordRoleId: '1431388062474309700', // ⚔️ - Don (El Comandante)
        systemRole: Role.DON_COMANDANTE,
        name: 'Don - El Comandante'
      },
      {
        discordRoleId: '1431388062474309698', // 🤝 - El Mano Derecha
        systemRole: Role.EL_MANO_DERECHA,
        name: 'El Mano Derecha'
      },
      // Ränge 7-9
      {
        discordRoleId: '1431388062427906229', // 🔒 - 9 | El Custodio
        systemRole: Role.EL_CUSTODIO,
        name: '9 | El Custodio'
      },
      {
        discordRoleId: '1431388062427906230', // 🎓 - 8 | El Mentor
        systemRole: Role.EL_MENTOR,
        name: '8 | El Mentor'
      },
      {
        discordRoleId: '1431388062427906231', // 📋 - 7 | El Encargado
        systemRole: Role.EL_ENCARGADO,
        name: '7 | El Encargado'
      },
      // Ränge 4-6
      {
        discordRoleId: '1431388062427906232', // 🛡️ - 6 | El Teniente
        systemRole: Role.EL_TENIENTE,
        name: '6 | El Teniente'
      },
      {
        discordRoleId: '1431388062427906228', // ⚔️ - 5 | Soldado
        systemRole: Role.SOLDADO,
        name: '5 | Soldado'
      },
      {
        discordRoleId: '1431388062427906233', // 📊 - 4 | El Prefecto
        systemRole: Role.EL_PREFECTO,
        name: '4 | El Prefecto'
      },
      // Ränge 1-3
      {
        discordRoleId: '1431388062427906234', // 🔍 - 3 | El Confidente
        systemRole: Role.EL_CONFIDENTE,
        name: '3 | El Confidente'
      },
      {
        discordRoleId: '1431388062427906235', // 🛡️ - 2 | El Protector
        systemRole: Role.EL_PROTECTOR,
        name: '2 | El Protector'
      },
      {
        discordRoleId: '1431388062427906236', // 🌱 - 1 | El Novato
        systemRole: Role.EL_NOVATO,
        name: '1 | El Novato'
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
