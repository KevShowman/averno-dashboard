const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;

async function diagnoseDiscordRoles() {
  try {
    console.log('🔍 DISCORD-ROLLEN DIAGNOSE\n');
    console.log('='.repeat(80) + '\n');

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
      const errorText = await response.text();
      console.log(`Fehlerdetails: ${errorText}\n`);
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
    console.log('='.repeat(80) + '\n');

    // 3. Vergleiche und zeige Unterschiede
    console.log('📋 VERGLEICH DB ↔ DISCORD:\n');

    let problemsFound = false;

    for (const mapping of dbMappings) {
      const discordRole = discordRoles.find(r => r.id === mapping.discordRoleId);
      
      if (discordRole) {
        console.log(`✅ ${mapping.systemRole.padEnd(20)} | DB: ${mapping.name.padEnd(20)} | Discord: ${discordRole.name.padEnd(20)} | ID: ${mapping.discordRoleId}`);
      } else {
        problemsFound = true;
        console.log(`❌ ${mapping.systemRole.padEnd(20)} | DB: ${mapping.name.padEnd(20)} | NICHT IM DISCORD GEFUNDEN! | ID: ${mapping.discordRoleId}`);
        console.log(`   🔍 Suche ähnliche Rolle im Discord...`);
        
        // Suche nach ähnlichem Namen
        const similar = discordRoles.find(r => 
          r.name.toLowerCase().includes(mapping.name.toLowerCase()) ||
          mapping.name.toLowerCase().includes(r.name.toLowerCase())
        );
        
        if (similar) {
          console.log(`   💡 GEFUNDEN: "${similar.name}" mit neuer ID: ${similar.id}`);
          console.log(`   📝 SQL UPDATE:\n`);
          console.log(`      UPDATE discord_role_mappings SET discordRoleId = '${similar.id}' WHERE id = '${mapping.id}';\n`);
        } else {
          console.log(`   ⚠️  Keine ähnliche Rolle gefunden!\n`);
        }
      }
    }

    console.log('\n' + '='.repeat(80) + '\n');
    console.log('📋 ALLE DISCORD-ROLLEN AUF DEM SERVER:\n');
    
    const sortedRoles = discordRoles
      .filter(r => r.name !== '@everyone')
      .sort((a, b) => b.position - a.position);

    sortedRoles.forEach(role => {
      const inDB = dbMappings.find(m => m.discordRoleId === role.id);
      const status = inDB ? `✅ ${inDB.systemRole}` : '❓ Nicht gemappt';
      console.log(`${status.padEnd(30)} | ${role.name.padEnd(30)} | ID: ${role.id}`);
    });

    console.log('\n' + '='.repeat(80) + '\n');
    
    if (problemsFound) {
      console.log('🚨 PROBLEM GEFUNDEN!\n');
      console.log('💡 LÖSUNG:\n');
      console.log('1. Kopiere die SQL UPDATE Commands von oben');
      console.log('2. Führe sie in phpMyAdmin → SQL-Tab aus');
      console.log('3. Lade die Seite neu und probiere nochmal einzuloggen\n');
    } else {
      console.log('✅ Alle Mappings sind korrekt!\n');
      console.log('🤔 Das Problem liegt woanders. Weitere Diagnose nötig...\n');
    }

  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseDiscordRoles();

