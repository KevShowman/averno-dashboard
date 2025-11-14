import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { DiscordService } from '../discord/discord.service';

const prisma = new PrismaClient();

async function syncDiscordRoles() {
  console.log('🔄 Starte Discord-Rollen-Synchronisierung...\n');

  // ConfigService initialisieren
  const configService = new ConfigService();
  
  // DiscordService initialisieren
  const discordService = new DiscordService(configService, prisma as any);

  try {
    // 1. Synchronisiere alle Mitglieder
    console.log('📊 Synchronisiere Discord-Mitglieder...');
    const result = await discordService.syncAllMembersWithAllowedRoles();

    console.log('\n✅ Synchronisierung abgeschlossen:');
    console.log(`  - Neue User importiert: ${result.imported}`);
    console.log(`  - User aktualisiert: ${result.updated}`);
    console.log(`  - Gesamt Discord-Mitglieder: ${result.total}`);
    
    if (result.errors && result.errors.length > 0) {
      console.log(`\n⚠️  Fehler bei ${result.errors.length} Mitgliedern:`);
      result.errors.forEach((err: any) => {
        console.log(`  - ${err.username}: ${err.error}`);
      });
    }

    // 2. Zeige User-Statistik
    console.log('\n📊 User-Statistik nach Synchronisierung:');
    const stats = await prisma.user.groupBy({
      by: ['role'],
      _count: true,
    });

    stats.forEach(stat => {
      console.log(`  - ${stat.role}: ${stat._count} User`);
    });

  } catch (error) {
    console.error('❌ Fehler bei der Synchronisierung:', error);
    throw error;
  }
}

syncDiscordRoles()
  .then(() => {
    console.log('\n✅ Script erfolgreich ausgeführt');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script fehlgeschlagen:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

