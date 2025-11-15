import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DiscordService } from '../discord/discord.service';

async function forceSyncAllUsers() {
  console.log('🔄 Starte Force-Sync für alle Benutzer...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const discordService = app.get(DiscordService);

  try {
    const result = await discordService.syncAllUserRoles();

    console.log('\n📊 Zusammenfassung:');
    console.log(`   Gesamt: ${result.total}`);
    console.log(`   Aktualisiert: ${result.updated}`);
    console.log(`   Fehler: ${result.errors}`);
    console.log(`   Unverändert: ${result.total - result.updated - result.errors}`);

    if (result.updated > 0) {
      console.log('\n✅ Sync erfolgreich abgeschlossen!');
    } else {
      console.log('\n➖ Keine Änderungen notwendig.');
    }

  } catch (error) {
    console.error('❌ Fehler beim Force-Sync:', error);
  } finally {
    await app.close();
  }
}

forceSyncAllUsers();
