import { PrismaClient } from '@prisma/client';
import { Client, GatewayIntentBits } from 'discord.js';

const prisma = new PrismaClient();

async function findGhostUsers() {
  console.log('👻 Suche nach Ghost Users (User in der DB, aber nicht mehr im Discord)...\n');

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
  console.log(`📊 Discord-Mitglieder: ${discordMemberIds.size}\n`);

  // Hole alle User aus der Datenbank
  const dbUsers = await prisma.user.findMany({
    select: {
      id: true,
      discordId: true,
      username: true,
      icFirstName: true,
      icLastName: true,
      role: true,
      createdAt: true,
    },
    orderBy: {
      username: 'asc',
    },
  });

  console.log(`📊 Datenbank-User: ${dbUsers.length}\n`);

  // Finde Ghost Users
  const ghostUsers = dbUsers.filter(user => !discordMemberIds.has(user.discordId));

  if (ghostUsers.length === 0) {
    console.log('✅ Keine Ghost Users gefunden!');
    await client.destroy();
    return;
  }

  console.log(`⚠️ ${ghostUsers.length} Ghost User(s) gefunden:\n`);

  for (const user of ghostUsers) {
    console.log(`User: ${user.username}`);
    console.log(`  ID: ${user.id}`);
    console.log(`  Discord ID: ${user.discordId}`);
    console.log(`  IC Name: ${user.icFirstName} ${user.icLastName}`);
    console.log(`  Rolle: ${user.role}`);
    console.log(`  Erstellt: ${user.createdAt.toLocaleDateString('de-DE')}`);

    // Zähle Relations
    const [sanctions, weeklyDeliveries, aufstellungen] = await Promise.all([
      prisma.sanction.count({ where: { userId: user.id } }),
      prisma.weeklyDelivery.count({ where: { userId: user.id } }),
      prisma.aufstellung.count({ where: { createdById: user.id } }),
    ]);

    console.log(`  📊 Sanktionen: ${sanctions}`);
    console.log(`  📊 Wochenabgaben: ${weeklyDeliveries}`);
    console.log(`  📊 Aufstellungen erstellt: ${aufstellungen}`);
    console.log('');
  }

  console.log(`\n💡 Tipp: Verwende das Script remove-ghost-users.ts zum Entfernen`);
  console.log('⚠️  ACHTUNG: Entfernen von Usern löscht NICHT ihre History (Sanktionen, etc.)');

  await client.destroy();
}

findGhostUsers()
  .then(() => {
    console.log('\n✅ Fertig!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fehler:', error);
    process.exit(1);
  });

