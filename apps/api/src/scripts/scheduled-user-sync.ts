import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function scheduledUserSync() {
  try {
    console.log(`[${new Date().toISOString()}] 🔄 Scheduled User Sync gestartet...`);

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

    // Hole alle aktiven Discord-Rollen-Mappings
    const roleMappings = await prisma.discordRoleMapping.findMany({
      where: { isActive: true }
    });

    // Rollen-Hierarchie (höhere Zahl = höhere Berechtigung)
    const roleHierarchy: Record<string, number> = {
      'RECLUTA': 1,
      'COYOTE': 2,
      'MERCADER': 3,
      'CAPATAZ': 4,
      'LINCE': 5,
      'EL_MUDO': 6,
      'GESTION_DE_RUTAS': 7,
      'PADRINO': 8,
      'CONSULTORA': 9,
      'CAPO': 10,
      'DON': 11,
      'PATRON': 12,
      'SICARIO': 5,
      'ROUTENVERWALTUNG': 6,
      'LOGISTICA': 5,
      'FUTURO': 1,
      'ADMIN': 12,
      'QUARTIERMEISTER': 5,
      'MITGLIED': 2,
      'GAST': 0,
    };

    let updatedCount = 0;

    for (const user of users) {
      try {
        // Konvertiere discordRoles zu Array (falls JSON)
        const userDiscordRoleIds = Array.isArray(user.discordRoles) 
          ? user.discordRoles 
          : (typeof user.discordRoles === 'string' ? JSON.parse(user.discordRoles) : []);

        if (userDiscordRoleIds.length === 0) {
          continue;
        }

        // Finde alle System-Rollen, die der User haben sollte
        const userRoleMappings = roleMappings.filter(mapping => 
          userDiscordRoleIds.includes(mapping.discordRoleId)
        );

        if (userRoleMappings.length === 0) {
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

          console.log(`✅ ${user.username}: ${user.role} → ${newHighestRole}`);
          updatedCount++;
        }

      } catch (error) {
        console.error(`❌ Fehler bei ${user.username}:`, error.message);
      }
    }

    if (updatedCount > 0) {
      console.log(`[${new Date().toISOString()}] ✅ ${updatedCount} User aktualisiert`);
    } else {
      console.log(`[${new Date().toISOString()}] ➖ Keine Änderungen`);
    }

  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Sync-Fehler:`, error);
  } finally {
    await prisma.$disconnect();
  }
}

scheduledUserSync();
