import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function forceSyncAllUsers() {
  try {
    console.log('🔄 Starte Force-Sync für alle Benutzer...\n');

    // Hole alle User
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        discordId: true,
        role: true,
        allRoles: true,
        discordRoles: true,
      }
    });

    console.log(`📊 Gefunden: ${users.length} Benutzer\n`);

    // Hole alle Discord-Rollen-Mappings
    const roleMappings = await prisma.discordRoleMapping.findMany({
      where: { isActive: true }
    });

    console.log(`📋 Aktive Rollen-Mappings: ${roleMappings.length}\n`);
    roleMappings.forEach(mapping => {
      console.log(`  • ${mapping.discordRoleId} → ${mapping.systemRole} (${mapping.name})`);
    });
    console.log('\n');

    // Rollen-Hierarchie (höhere Zahl = höhere Berechtigung)
    const roleHierarchy: Record<string, number> = {
      'EL_NOVATO': 1,
      'EL_PROTECTOR': 2,
      'EL_CONFIDENTE': 3,
      'EL_PREFECTO': 4,
      'SOLDADO': 5,
      'EL_TENIENTE': 6,
      'EL_ENCARGADO': 7,
      'EL_MENTOR': 8,
      'EL_CUSTODIO': 9,
      'EL_MANO_DERECHA': 10,
      'DON_COMANDANTE': 11,
      'DON_CAPITAN': 12,
      'EL_PATRON': 13,
      'SICARIO': 5,
      'ROUTENVERWALTUNG': 6,
      'LOGISTICA': 5,
      'FUTURO': 1,
      'ADMIN': 13,
      'QUARTIERMEISTER': 5,
      'MITGLIED': 2,
      'GAST': 0,
    };

    let updatedCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        // Konvertiere discordRoles zu Array (falls JSON)
        const userDiscordRoleIds = Array.isArray(user.discordRoles) 
          ? user.discordRoles 
          : (typeof user.discordRoles === 'string' ? JSON.parse(user.discordRoles) : []);

        if (userDiscordRoleIds.length === 0) {
          console.log(`⚠️  ${user.username}: Keine Discord-Rollen gefunden`);
          continue;
        }

        // Finde alle System-Rollen, die der User haben sollte
        const userRoleMappings = roleMappings.filter(mapping => 
          userDiscordRoleIds.includes(mapping.discordRoleId)
        );

        if (userRoleMappings.length === 0) {
          console.log(`⚠️  ${user.username}: Keine gültigen Rollen-Mappings gefunden`);
          console.log(`     Discord-Rollen: ${userDiscordRoleIds.join(', ')}`);
          continue;
        }

        // Berechne alle System-Rollen
        const allSystemRoles = userRoleMappings.map(m => m.systemRole);

        // Finde die höchste Rolle
        const highestRoleMapping = userRoleMappings.reduce((highest, current) => {
          const currentLevel = roleHierarchy[current.systemRole] || 0;
          const highestLevel = roleHierarchy[highest.systemRole] || 0;
          return currentLevel > highestLevel ? current : highest;
        });

        const newHighestRole = highestRoleMapping.systemRole;

        // Prüfe ob sich etwas geändert hat
        const currentAllRoles = Array.isArray(user.allRoles) 
          ? user.allRoles 
          : (typeof user.allRoles === 'string' ? JSON.parse(user.allRoles) : []);

        const rolesChanged = user.role !== newHighestRole || 
                            JSON.stringify(currentAllRoles.sort()) !== JSON.stringify(allSystemRoles.sort());

        if (rolesChanged) {
          // Update User
          await prisma.user.update({
            where: { id: user.id },
            data: {
              role: newHighestRole,
              allRoles: allSystemRoles,
            }
          });

          console.log(`✅ ${user.username}:`);
          console.log(`   Alte Rolle: ${user.role}`);
          console.log(`   Neue Rolle: ${newHighestRole}`);
          console.log(`   Alle Rollen: ${allSystemRoles.join(', ')}`);
          console.log(`   Discord-Rollen: ${userRoleMappings.map(m => m.name).join(', ')}`);
          console.log('');
          
          updatedCount++;
        } else {
          console.log(`➖ ${user.username}: Keine Änderung (${user.role})`);
        }

      } catch (error) {
        console.error(`❌ Fehler bei ${user.username}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 Zusammenfassung:');
    console.log(`   Gesamt: ${users.length}`);
    console.log(`   Aktualisiert: ${updatedCount}`);
    console.log(`   Fehler: ${errorCount}`);
    console.log(`   Unverändert: ${users.length - updatedCount - errorCount}`);

  } catch (error) {
    console.error('❌ Kritischer Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

forceSyncAllUsers();

