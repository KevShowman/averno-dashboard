import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WeeklyDeliveryService } from '../weekly-delivery/weekly-delivery.service';
import { SanctionsService } from '../sanctions/sanctions.service';
import { DiscordService } from '../discord/discord.service';
import { AufstellungService } from '../aufstellung/aufstellung.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private weeklyDeliveryService: WeeklyDeliveryService,
    private sanctionsService: SanctionsService,
    private discordService: DiscordService,
    private aufstellungService: AufstellungService,
  ) {}

  // Automatische Archivierung jeden Montag um 00:01 AM
  @Cron('1 0 * * 1', {
    name: 'weekly-archive',
    timeZone: 'Europe/Berlin',
  })
  async handleWeeklyArchive() {
    this.logger.log('📦 Starte wöchentliche Archivierung...');
    
    try {
      const result = await this.weeklyDeliveryService.archiveCurrentWeek('system');
      this.logger.log(`✅ Woche archiviert: ${result.message}`);
      this.logger.log(`📊 Archive: ${result.archive.totalDeliveries} Abgaben archiviert`);
      this.logger.log(`⚖️ Sanktionen: ${result.sanctions.sanctions?.length || 0} Sanktionen erstellt`);
    } catch (error) {
      this.logger.error('❌ Fehler bei der wöchentlichen Archivierung:', error);
    }
  }

  // Automatischer Wochenreset jeden Montag um 00:01 AM
  @Cron('1 0 * * 1', {
    name: 'weekly-reset',
    timeZone: 'Europe/Berlin',
  })
  async handleWeeklyReset() {
    this.logger.log('🔄 Starte wöchentlichen Reset...');
    
    try {
      const result = await this.weeklyDeliveryService.weeklyReset();
      this.logger.log(`✅ Wöchentlicher Reset abgeschlossen: ${result.message}`);
      this.logger.log(`📊 Indexiert: ${result.indexed.message}`);
      this.logger.log(`⚖️ Sanktionen: ${result.sanctions.message}`);
    } catch (error) {
      this.logger.error('❌ Fehler beim wöchentlichen Reset:', error);
    }
  }

  // Automatische Bereinigung abgelaufener Sanktionen jeden Tag um 02:00 AM
  @Cron('0 2 * * *', {
    name: 'sanctions-cleanup',
    timeZone: 'Europe/Berlin',
  })
  async handleSanctionsCleanup() {
    this.logger.log('🧹 Starte Bereinigung abgelaufener Sanktionen...');
    
    try {
      const result = await this.sanctionsService.cleanupExpiredSanctions();
      this.logger.log(`✅ Sanktionen-Bereinigung abgeschlossen: ${result.message}`);
    } catch (error) {
      this.logger.error('❌ Fehler bei der Sanktionen-Bereinigung:', error);
    }
  }

  // Automatische Sanktionierung überfälliger Abgaben jeden Montag um 00:01 AM
  @Cron('1 0 * * 1', {
    name: 'auto-sanction-overdue',
    timeZone: 'Europe/Berlin',
  })
  async handleAutoSanctionOverdue() {
    this.logger.log('⚖️ Starte automatische Sanktionierung überfälliger Abgaben...');
    
    try {
      const result = await this.weeklyDeliveryService.autoSanctionOverdue();
      this.logger.log(`✅ Automatische Sanktionierung abgeschlossen: ${result.message}`);
    } catch (error) {
      this.logger.error('❌ Fehler bei der automatischen Sanktionierung:', error);
    }
  }

  // Automatische 48h-Sanktionierung jeden Montag um 00:01 AM
  @Cron('1 0 * * 1', {
    name: 'auto-sanction-48h',
    timeZone: 'Europe/Berlin',
  })
  async handleAutoSanction48h() {
    this.logger.log('⏰ Starte automatische 48h-Sanktionierung...');
    
    try {
      const result = await this.sanctionsService.autoSanctionUnpaidAfter48h();
      this.logger.log(`✅ 48h-Sanktionierung abgeschlossen: ${result.processed} Sanktionen verarbeitet`);
      
      if (result.sanctions.length > 0) {
        this.logger.log(`⚖️ Neue 48h-Sanktionen erstellt für: ${result.sanctions.map(s => s.new48hSanction.user.username).join(', ')}`);
      }
    } catch (error) {
      this.logger.error('❌ Fehler bei der 48h-Sanktionierung:', error);
    }
  }

  // Manueller Test des Wochenresets (für Entwicklung)
  async manualWeeklyReset() {
    this.logger.log('🔧 Manueller Wochenreset gestartet...');
    return this.handleWeeklyReset();
  }

  // Manueller Test der Sanktionen-Bereinigung (für Entwicklung)
  async manualSanctionsCleanup() {
    this.logger.log('🔧 Manuelle Sanktionen-Bereinigung gestartet...');
    return this.handleSanctionsCleanup();
  }

  // Manueller Test der automatischen Sanktionierung (für Entwicklung)
  async manualAutoSanctionOverdue() {
    this.logger.log('🔧 Manuelle automatische Sanktionierung gestartet...');
    return this.handleAutoSanctionOverdue();
  }

  // Manueller Test der 48h-Sanktionierung (für Entwicklung)
  async manualAutoSanction48h() {
    this.logger.log('🔧 Manuelle 48h-Sanktionierung gestartet...');
    return this.handleAutoSanction48h();
  }

  // Discord-User-Synchronisierung jeden Tag um 03:00 AM
  @Cron('0 3 * * *', {
    name: 'discord-user-sync',
    timeZone: 'Europe/Berlin',
  })
  async handleDiscordUserSync() {
    this.logger.log('🔄 Starte Discord-User-Synchronisierung...');
    
    try {
      const result = await this.discordService.syncUsersAndRemoveInactive();
      this.logger.log(`✅ Discord-Synchronisierung abgeschlossen:`);
      this.logger.log(`   - ${result.removed} User entfernt (nicht mehr im Discord)`);
      this.logger.log(`   - ${result.imported} neue User importiert`);
      this.logger.log(`   - ${result.updated} User aktualisiert`);
      this.logger.log(`   - ${result.totalDiscordMembers} User im Discord gefunden`);
    } catch (error) {
      this.logger.error('❌ Fehler bei der Discord-Synchronisierung:', error);
    }
  }

  // Manueller Test der Discord-Synchronisierung (für Entwicklung)
  async manualDiscordSync() {
    this.logger.log('🔧 Manuelle Discord-Synchronisierung gestartet...');
    return this.handleDiscordUserSync();
  }

  // Automatische Sanktionierung nicht-reagierender Aufstellungs-Teilnehmer
  // Läuft jede Stunde um zu prüfen ob Deadlines abgelaufen sind
  @Cron('0 * * * *', {
    name: 'aufstellung-sanction-check',
    timeZone: 'Europe/Berlin',
  })
  async handleAufstellungSanctionCheck() {
    this.logger.log('🔍 Prüfe Aufstellungen mit abgelaufener Deadline...');
    
    try {
      // Hole alle Aufstellungen deren Deadline abgelaufen ist
      const allAufstellungen = await this.aufstellungService.getAllAufstellungen();
      const now = new Date();
      
      let totalSanctioned = 0;
      
      for (const aufstellung of allAufstellungen) {
        // Nur wenn Deadline abgelaufen und in der Vergangenheit (max 24h zurück)
        const deadlineDate = new Date(aufstellung.deadline);
        const hoursSinceDeadline = (now.getTime() - deadlineDate.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceDeadline > 0 && hoursSinceDeadline <= 24) {
          try {
            const result = await this.aufstellungService.sanctionNonResponders(aufstellung.id);
            totalSanctioned += result.sanctionedUsers;
            
            if (result.sanctionedUsers > 0) {
              this.logger.log(`⚖️ ${result.sanctionedUsers} User sanktioniert für Aufstellung "${aufstellung.reason}"`);
            }
          } catch (error) {
            // Fehler ignorieren (z.B. bereits sanktioniert)
          }
        }
      }
      
      if (totalSanctioned > 0) {
        this.logger.log(`✅ Aufstellungs-Sanktionierung abgeschlossen: ${totalSanctioned} User sanktioniert`);
      }
    } catch (error) {
      this.logger.error('❌ Fehler bei der Aufstellungs-Sanktionierung:', error);
    }
  }

  // Manueller Test der Aufstellungs-Sanktionierung (für Entwicklung)
  async manualAufstellungSanction() {
    this.logger.log('🔧 Manuelle Aufstellungs-Sanktionierung gestartet...');
    return this.handleAufstellungSanctionCheck();
  }
}
