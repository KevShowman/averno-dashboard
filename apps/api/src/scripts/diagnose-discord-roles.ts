import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const configService = new ConfigService();

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;

async function diagnoseDiscordRoles() {
  try {
    console.log('🔍 DISCORD-ROLLEN DIAGNOSE\n');
    console.log('=' .repeat(80) + '\n');

    if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID) {
      console.log('❌ DISCORD_BOT_TOKEN oder DISCORD_GUILD_ID fehlt in .env!\n');
      return;
    }

    // 1. Hole alle Rollen vom Discord Server
    console.log('📡 Hole Discord-Server-Rollen...\n');
    const response = await fetch(
      `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/roles`,
      {
        headers: {
          'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.log(`❌ Discord API Fehler: ${response.status} ${response.statusText}\n`);
      return;
    }

    const discordRoles = await response.json();
    console.log(`✅ ${discordRoles.length} Rollen vom Discord-Server erhalten\n`);

    // 2. Hole Mappings aus der DB
    const dbMappings = await prisma.discordRoleMapping.findMany({
      where: { isActive: true },
      orderBy: { systemRole: 'asc' }
    });

    console.log(`✅ ${dbMappings.length} aktive Mappings in der Datenbank\n`);
    console.log('=' .repeat(80) + '\n');

    // 3. Vergleiche und zeige Unterschiede
    console.log('📋 VERGLEICH DB ↔ DISCORD:\n');

    for (const mapping of dbMappings) {
      const discordRole = discordRoles.find((r: any) => r.id === mapping.discordRoleId);
      
      if (discordRole) {
        console.log(`✅ ${mapping.systemRole.padEnd(20)} | DB: ${mapping.name.padEnd(20)} | Discord: ${discordRole.name.padEnd(20)} | ID: ${mapping.discordRoleId}`);
      } else {
        console.log(`❌ ${mapping.systemRole.padEnd(20)} | DB: ${mapping.name.padEnd(20)} | NICHT IM DISCORD GEFUNDEN! | ID: ${mapping.discordRoleId}`);
        console.log(`   🔍 Suche ähnliche Rolle im Discord...`);
        
        // Suche nach ähnlichem Namen
        const similar = discordRoles.find((r: any) => 
          r.name.toLowerCase().includes(mapping.name.toLowerCase()) ||
          mapping.name.toLowerCase().includes(r.name.toLowerCase())
        );
        
        if (similar) {
          console.log(`   💡 GEFUNDEN: "${similar.name}" mit neuer ID: ${similar.id}`);
          console.log(`   📝 SQL UPDATE: UPDATE discord_role_mappings SET discordRoleId = '${similar.id}' WHERE id = '${mapping.id}';`);
        }
        console.log('');
      }
    }

    console.log('\n' + '=' .repeat(80) + '\n');
    console.log('📋 ALLE DISCORD-ROLLEN AUF DEM SERVER:\n');
    
    const sortedRoles = discordRoles
      .filter((r: any) => r.name !== '@everyone')
      .sort((a: any, b: any) => b.position - a.position);

    sortedRoles.forEach((role: any) => {
      const inDB = dbMappings.find(m => m.discordRoleId === role.id);
      const status = inDB ? `✅ ${inDB.systemRole}` : '❓ Nicht gemappt';
      console.log(`${status.padEnd(30)} | ${role.name.padEnd(30)} | ID: ${role.id}`);
    });

    console.log('\n' + '=' .repeat(80) + '\n');
    console.log('💡 NÄCHSTE SCHRITTE:\n');
    console.log('1. Wenn Rollen mit ❌ markiert sind: SQL UPDATE Commands kopieren und in DB ausführen');
    console.log('2. Oder: In Einstellungen → Discord-Rollen-Synchronisation → "Rollen neu laden"\n');

  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseDiscordRoles();

