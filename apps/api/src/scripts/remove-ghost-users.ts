import { PrismaClient } from '@prisma/client';
import { Client, GatewayIntentBits } from 'discord.js';

const prisma = new PrismaClient();

async function removeGhostUsers() {
  console.log('🗑️  Entferne Ghost Users (User in der DB, aber nicht mehr im Discord)...\n');
  console.log('⚠️  ACHTUNG: Dieses Script löscht User, aber BEHÄLT ihre History (Sanktionen, Wochenabgaben, etc.)\n');

  const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
  const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;

  if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID) {
    console.error('❌ DISCORD_BOT_TOKEN oder DISCORD_GUILD_ID fehlen in der .env');
    process.exit(1);
  }

  // Discord Client erstellen
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
    ],
  });

  await client.login(DISCORD_BOT_TOKEN);
  console.log('✅ Discord Bot eingeloggt\n');

  // Warte auf Ready
  await new Promise(resolve => client.once('ready', resolve));

  const guild = await client.guilds.fetch(DISCORD_GUILD_ID);
  if (!guild) {
    console.error('❌ Guild nicht gefunden');
    process.exit(1);
  }

  console.log(`📊 Guild: ${guild.name}\n`);

  // Hole alle Discord-Mitglieder
  const discordMembers = await guild.members.fetch();
  const discordMemberIds = new Set(discordMembers.map(m => m.user.id));

  // Hole alle User aus der Datenbank
  const dbUsers = await prisma.user.findMany({
    select: {
      id: true,
      discordId: true,
      username: true,
    },
  });

  // Finde Ghost Users
  const ghostUsers = dbUsers.filter(user => !discordMemberIds.has(user.discordId));

  if (ghostUsers.length === 0) {
    console.log('✅ Keine Ghost Users zum Entfernen gefunden!');
    await client.destroy();
    return;
  }

  console.log(`⚠️ ${ghostUsers.length} Ghost User(s) werden gelöscht:\n`);

  let removedCount = 0;

  for (const user of ghostUsers) {
    try {
      console.log(`Entferne: ${user.username} (${user.discordId})...`);
      
      // Lösche User (Relations bleiben erhalten durch FK ohne CASCADE)
      await prisma.user.delete({
        where: { id: user.id },
      });

      removedCount++;
      console.log(`  ✅ Gelöscht\n`);
    } catch (error) {
      console.error(`  ❌ Fehler beim Löschen:`, error.message);
      console.error(`     Möglicherweise gibt es noch abhängige Relations\n`);
    }
  }

  console.log(`\n✅ ${removedCount} von ${ghostUsers.length} Ghost User(s) entfernt`);

  if (removedCount < ghostUsers.length) {
    console.log('\n⚠️  Einige User konnten nicht gelöscht werden.');
    console.log('    Dies liegt daran, dass sie noch abhängige Relations haben.');
    console.log('    Du kannst diese User manuell entfernen oder ihre Relations zuerst löschen.');
  }

  await client.destroy();
}

removeGhostUsers()
  .then(() => {
    console.log('\n✅ Fertig!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fehler:', error);
    process.exit(1);
  });

