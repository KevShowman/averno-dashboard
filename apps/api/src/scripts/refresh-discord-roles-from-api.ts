import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

async function refreshDiscordRolesFromAPI() {
  try {
    console.log('🔄 Aktualisiere Discord-Rollen direkt von Discord API...\n');

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        discordId: true,
        role: true,
      }
    });

    console.log(`📊 Gefunden: ${users.length} Benutzer\n`);

    const botToken = process.env.DISCORD_BOT_TOKEN;
    const guildId = process.env.DISCORD_GUILD_ID;

    if (!botToken || !guildId) {
      console.error('❌ DISCORD_BOT_TOKEN oder DISCORD_GUILD_ID fehlt!');
      return;
    }

    let updated = 0;
    let errors = 0;

    for (const user of users) {
      if (!user.discordId) {
        console.log(`⚠️  ${user.username}: Keine Discord-ID`);
        continue;
      }

      try {
        // Hole Member-Daten von Discord API
        const response = await axios.get(
          `https://discord.com/api/v10/guilds/${guildId}/members/${user.discordId}`,
          {
            headers: {
              Authorization: `Bot ${botToken}`,
            }
          }
        );

        const memberRoles = response.data.roles || [];
        
        console.log(`✅ ${user.username}:`);
        console.log(`   Discord-Rollen (NEU): ${memberRoles.join(', ')}`);

        // Update User mit neuen Discord-Rollen
        await prisma.user.update({
          where: { id: user.id },
          data: {
            discordRoles: memberRoles,
          }
        });

        updated++;

      } catch (error: any) {
        console.error(`❌ ${user.username}: ${error.response?.data?.message || error.message}`);
        errors++;
      }

      // Rate Limiting: 50 requests per second
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n📊 Zusammenfassung:');
    console.log(`   Aktualisiert: ${updated}`);
    console.log(`   Fehler: ${errors}`);
    console.log('\n✅ Jetzt kannst du den Force-Sync erneut ausführen!');
    console.log('   docker exec -it lasanta-api npx ts-node src/scripts/force-sync-all-users.ts');

  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

refreshDiscordRolesFromAPI();

