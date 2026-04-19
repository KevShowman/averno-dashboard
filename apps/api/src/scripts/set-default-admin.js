const { PrismaClient, Role } = require('@prisma/client');

const prisma = new PrismaClient();

const DEFAULT_ADMIN_DISCORD_ID = '1040754827589865472';

async function setDefaultAdmin() {
  try {
    console.log('🔍 Suche nach Standard-Admin...');
    
    // Prüfe ob der Benutzer bereits existiert
    const existingUser = await prisma.user.findUnique({
      where: { discordId: DEFAULT_ADMIN_DISCORD_ID },
    });

    if (existingUser) {
      if (existingUser.role === Role.PATRON) {
        console.log('✅ Standard-Admin ist bereits als Patron konfiguriert:');
        console.log(`   Name: ${existingUser.username}`);
        console.log(`   Discord ID: ${existingUser.discordId}`);
        console.log(`   Rolle: ${existingUser.role}`);
        return;
      } else {
        // Update zur Patron Rolle
        const updatedUser = await prisma.user.update({
          where: { discordId: DEFAULT_ADMIN_DISCORD_ID },
          data: { role: Role.PATRON },
        });

        console.log('✅ Standard-Admin wurde zur Patron Rolle befördert:');
        console.log(`   Name: ${updatedUser.username}`);
        console.log(`   Discord ID: ${updatedUser.discordId}`);
        console.log(`   Neue Rolle: ${updatedUser.role}`);
        return;
      }
    }

    console.log(`⚠️  Benutzer mit Discord ID ${DEFAULT_ADMIN_DISCORD_ID} nicht gefunden.`);
    console.log('   Der Benutzer muss sich mindestens einmal anmelden, bevor er Admin werden kann.');
    console.log('   Nach der ersten Anmeldung kann dieses Script erneut ausgeführt werden.');

  } catch (error) {
    console.error('❌ Fehler beim Setzen des Standard-Admins:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setDefaultAdmin();
