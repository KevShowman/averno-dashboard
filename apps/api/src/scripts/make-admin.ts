import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function makeAdmin() {
  const discordId = process.argv[2];
  
  if (!discordId) {
    console.error('❌ Fehler: Discord ID fehlt');
    console.log('Verwendung: pnpm make-admin <DISCORD_ID>');
    console.log('Beispiel: pnpm make-admin 123456789012345678');
    process.exit(1);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { discordId },
    });

    if (!user) {
      console.error(`❌ Benutzer mit Discord ID ${discordId} nicht gefunden`);
      console.log('Der Benutzer muss sich erst einmal anmelden, bevor er Admin werden kann.');
      process.exit(1);
    }

    const updatedUser = await prisma.user.update({
      where: { discordId },
      data: { role: Role.ADMIN },
    });

    console.log('✅ Erfolgreich! Benutzer ist jetzt Admin:');
    console.log(`   Name: ${updatedUser.username}`);
    console.log(`   Discord ID: ${updatedUser.discordId}`);
    console.log(`   Rolle: ${updatedUser.role}`);
    console.log('');
    console.log('💀 Viva La Santa Calavera! 💀');

  } catch (error) {
    console.error('❌ Fehler beim Aktualisieren der Rolle:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

makeAdmin();

