import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Dieses Script setzt die discordRoles auf NULL für alle User,
 * damit sie beim nächsten Login automatisch neu von Discord abgerufen werden.
 */
async function refreshDiscordRoles() {
  try {
    console.log('🔄 Setze Discord-Rollen zurück...\n');

    // Setze discordRoles auf leeres Array für alle User
    const result = await prisma.user.updateMany({
      data: {
        discordRoles: [],
      }
    });

    console.log(`✅ ${result.count} User aktualisiert`);
    console.log('\n📝 Die User müssen sich jetzt neu einloggen, damit ihre Discord-Rollen aktualisiert werden.');
    console.log('   Oder warte 5 Minuten bis der automatische Sync läuft.');

  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

refreshDiscordRoles();

