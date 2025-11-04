import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WeeklyDeliveryService } from '../weekly-delivery/weekly-delivery.service';
import { SanctionsService } from '../sanctions/sanctions.service';
import { DiscordService } from '../discord/discord.service';
import { AufstellungService } from '../aufstellung/aufstellung.service';
import { FamiliensammelnService } from '../familiensammeln/familiensammeln.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private weeklyDeliveryService: WeeklyDeliveryService,
    private sanctionsService: SanctionsService,
    private discordService: DiscordService,
    private aufstellungService: AufstellungService,
    private familiensammelnService: FamiliensammelnService,
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

  // Discord Member Sync - alle 5 Minuten
  @Cron('*/5 * * * *', {
    name: 'discord-member-sync',
    timeZone: 'Europe/Berlin',
  })
  async handleDiscordMemberSync() {
    this.logger.log('🔄 Starte Discord Member Sync (Ghost User Removal)...');
    
    try {
      const result = await this.discordService.syncDiscordMembers();
      
      if (result.deleted > 0) {
        this.logger.log(`✅ Discord Sync abgeschlossen: ${result.deleted} Ghost Users gelöscht (${result.total} User in DB)`);
      }
    } catch (error) {
      this.logger.error('❌ Fehler beim Discord Member Sync:', error);
    }
  }

  // Manueller Test der Discord-Synchronisierung (für Entwicklung)
  async manualDiscordSync() {
    this.logger.log('🔧 Manueller Discord Member Sync gestartet...');
    return this.handleDiscordMemberSync();
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

  // Familiensammeln: Prüfung und Sanktionierung am Sonntag um 23:55
  @Cron('55 23 * * 0', {
    name: 'familiensammeln-check',
    timeZone: 'Europe/Berlin',
  })
  async handleFamiliensammelnCheck() {
    this.logger.log('👨‍👩‍👧‍👦 Prüfe Familiensammeln-Teilnahmen...');
    
    try {
      const currentWeek = await this.familiensammelnService.getCurrentWeek();
      const statistics = await this.familiensammelnService.getWeekStatistics(currentWeek.id);
      
      // Hole alle User und vergleiche mit Statistik um ausgeschlossene zu zählen
      const allUsers = await this.prisma.user.count();
      const eligibleUsers = statistics.statistics.length;
      const excludedUsers = allUsers - eligibleUsers;
      
      if (excludedUsers > 0) {
        this.logger.log(`ℹ️  ${excludedUsers} User von Wochenabgabe ausgeschlossen (werden nicht geprüft)`);
      }
      
      let totalSanctioned = 0;
      
      for (const stat of statistics.statistics) {
        // Wenn User weniger als 3 Tage teilgenommen hat
        if (stat.participationCount < 3) {
          // Prüfe ob Wochenabgabe bezahlt wurde
          const weekStart = new Date(currentWeek.weekStart);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6); // Bis Sonntag
          
          const weeklyDelivery = await this.weeklyDeliveryService.getWeeklyDeliveryForUser(
            stat.user.id,
            weekStart,
            weekEnd,
          );
          
          // Wenn Wochenabgabe nicht bezahlt wurde -> Sanktion
          if (weeklyDelivery && weeklyDelivery.status !== 'PAID') {
            await this.sanctionsService.createSanction(
              stat.user.id,
              'WOCHENABGABE_NICHT_ENTRICHTET' as any,
              1,
              `Weniger als 3 Tage beim Familiensammeln teilgenommen (${stat.participationCount} Tag(e)) und Wochenabgabe nicht bezahlt`,
              'system',
            );
            
            totalSanctioned++;
            this.logger.log(`⚖️ Sanktion erstellt für ${stat.user.username}: ${stat.participationCount} Tag(e) Familiensammeln, Wochenabgabe nicht bezahlt`);
          }
        }
      }
      
      if (totalSanctioned > 0) {
        this.logger.log(`✅ Familiensammeln-Prüfung abgeschlossen: ${totalSanctioned} Sanktionen erstellt`);
      } else {
        this.logger.log('✅ Familiensammeln-Prüfung abgeschlossen: Keine Sanktionen erforderlich');
      }
    } catch (error) {
      this.logger.error('❌ Fehler bei der Familiensammeln-Prüfung:', error);
    }
  }

  // Manueller Test der Familiensammeln-Prüfung (für Entwicklung)
  async manualFamiliensammelnCheck() {
    this.logger.log('🔧 Manuelle Familiensammeln-Prüfung gestartet...');
    return this.handleFamiliensammelnCheck();
  }

  // Familiensammeln: Wöchentlicher Reset jeden Montag um 00:01
  @Cron('1 0 * * 1', {
    name: 'familiensammeln-weekly-reset',
    timeZone: 'Europe/Berlin',
  })
  async handleFamiliensammelnWeeklyReset() {
    this.logger.log('🔄 Starte Familiensammeln Wochenreset...');
    
    try {
      // Erstelle die neue Woche für diese Woche (Montag-Samstag)
      const now = new Date();
      const monday = this.getMondayOfWeek(now);
      
      const newWeek = await this.familiensammelnService.getOrCreateWeek(monday);
      
      this.logger.log(`✅ Familiensammeln Wochenreset abgeschlossen: Neue Woche erstellt (${newWeek.weekStart.toISOString().split('T')[0]} - ${newWeek.weekEnd.toISOString().split('T')[0]})`);
    } catch (error) {
      this.logger.error('❌ Fehler beim Familiensammeln Wochenreset:', error);
    }
  }

  // Hilfsmethode: Berechne Montag der Woche
  private getMondayOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Montag
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  // Manueller Test des Familiensammeln Wochenresets (für Entwicklung)
  async manualFamiliensammelnWeeklyReset() {
    this.logger.log('🔧 Manueller Familiensammeln Wochenreset gestartet...');
    return this.handleFamiliensammelnWeeklyReset();
  }
}
