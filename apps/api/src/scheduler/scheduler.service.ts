import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WeeklyDeliveryService } from '../weekly-delivery/weekly-delivery.service';
import { SanctionsService } from '../sanctions/sanctions.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private weeklyDeliveryService: WeeklyDeliveryService,
    private sanctionsService: SanctionsService,
  ) {}

  // Automatischer Wochenreset jeden Montag um 03:00 AM
  @Cron('0 3 * * 1', {
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

  // Automatische Sanktionierung überfälliger Abgaben jeden Tag um 01:00 AM
  @Cron('0 1 * * *', {
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
}
