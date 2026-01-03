import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Sanction, SanctionCategory, SanctionStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { DiscordService } from '../discord/discord.service';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class SanctionsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private discordService: DiscordService,
    private settingsService: SettingsService,
  ) {}

  // Automatische 48h-Sanktionierung für unbezahlte Sanktionen
  async autoSanctionUnpaidAfter48h() {
    const fortyEightHoursAgo = new Date();
    fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

    // Finde alle aktiven Sanktionen, die älter als 48 Stunden sind
    const unpaidSanctions = await this.prisma.sanction.findMany({
      where: {
        status: SanctionStatus.ACTIVE,
        createdAt: {
          lt: fortyEightHoursAgo,
        },
        category: {
          notIn: [SanctionCategory.NICHT_BEZAHLT_48H, SanctionCategory.NICHT_BEZAHLT], // Ausschließen von bereits 48h-Sanktionen und Wochenabgabe-Sanktionen
        },
      },
      include: {
        user: true,
      },
    });

    const results = [];

    for (const sanction of unpaidSanctions) {
      // Prüfe ob User Taxi oder Partner ist - diese sollen nicht auto-sanktioniert werden
      const user = await this.prisma.user.findUnique({
        where: { id: sanction.userId },
        select: { isTaxi: true, isPartner: true },
      });

      if (user?.isTaxi || user?.isPartner) {
        continue; // Überspringe Taxi/Partner-User
      }

      // Prüfe, ob bereits eine aktive 48h-Sanktion für diesen User existiert
      const existing48hSanction = await this.prisma.sanction.findFirst({
        where: {
          userId: sanction.userId,
          category: SanctionCategory.NICHT_BEZAHLT_48H,
          status: SanctionStatus.ACTIVE,
        },
      });

      if (!existing48hSanction) {
        // Berechne Level für 48h-Sanktion basierend auf vorherigen 48h-Sanktionen
        const level = await this.calculateNextLevel(sanction.userId, SanctionCategory.NICHT_BEZAHLT_48H);
        
        // Erstelle 48h-Sanktion
        const penalty = this.calculatePenalty(SanctionCategory.NICHT_BEZAHLT_48H, level);
        
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 28);

        const newSanction = await this.prisma.sanction.create({
          data: {
            userId: sanction.userId,
            category: SanctionCategory.NICHT_BEZAHLT_48H,
            level,
            description: `Automatische Sanktion: Ursprüngliche Sanktion (${sanction.category}, Level ${sanction.level}) nicht innerhalb von 48 Stunden bezahlt`,
            amount: penalty.amount,
            penalty: penalty.penalty,
            expiresAt,
            status: SanctionStatus.ACTIVE,
            createdById: sanction.createdById, // Verwende den Ersteller der ursprünglichen Sanktion
          },
          include: {
            user: true,
            createdBy: true,
          },
        });

        results.push({
          originalSanction: sanction,
          new48hSanction: newSanction,
        });
      }
    }

    return {
      processed: results.length,
      sanctions: results,
    };
  }

  // Automatisches Level berechnen basierend auf vorherigen Sanktionen
  async calculateNextLevel(userId: string, category: SanctionCategory): Promise<number> {
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    const recentSanctions = await this.prisma.sanction.findMany({
      where: {
        userId,
        category,
        status: {
          in: [SanctionStatus.ACTIVE, SanctionStatus.PAID], // Berücksichtige sowohl aktive als auch bezahlte Sanktionen
        },
        createdAt: {
          gte: fourWeeksAgo,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (recentSanctions.length === 0) {
      return 1; // Erste Sanktion dieser Kategorie
    }

    // Höchstes Level der letzten 4 Wochen finden (auch bezahlte Sanktionen)
    const highestLevel = Math.max(...recentSanctions.map(s => s.level));
    
    // Nächstes Level (max. 4)
    return Math.min(highestLevel + 1, 4);
  }

  // Sanktion erstellen mit automatischem Level
  async createSanctionWithAutoLevel(
    userId: string,
    category: SanctionCategory,
    description: string,
    createdById: string
  ) {
    const level = await this.calculateNextLevel(userId, category);
    return this.createSanction(userId, category, level, description, createdById);
  }

  // Sanktion erstellen (manuelle Level)
  async createSanction(
    userId: string,
    category: SanctionCategory,
    level: number,
    description: string,
    createdById: string
  ) {
    // Level validieren (1-4)
    if (level < 1 || level > 4) {
      throw new BadRequestException('Level muss zwischen 1 und 4 liegen');
    }

    // Sanktion basierend auf Kategorie und Level berechnen
    const penalty = this.calculatePenalty(category, level);

    // Ablaufdatum setzen (4 Wochen)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 28);

    const sanction = await this.prisma.sanction.create({
      data: {
        userId,
        category,
        level,
        description,
        amount: penalty.amount,
        penalty: penalty.penalty,
        createdById,
        expiresAt,
      },
      include: {
        user: {
          select: {
            id: true,
            discordId: true,
            username: true,
            icFirstName: true,
            icLastName: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    // Discord DM senden
    await this.sendSanctionNotification(sanction);

    return sanction;
  }

  // Discord DM bei Sanktion senden
  private async sendSanctionNotification(sanction: any) {
    try {
      const user = sanction.user;
      if (!user?.discordId) {
        console.log('Keine Discord ID für Sanktions-Benachrichtigung gefunden');
        return;
      }

      const categoryName = this.getCategoryDisplayName(sanction.category);
      const userName = user.icFirstName && user.icLastName 
        ? `${user.icFirstName} ${user.icLastName}` 
        : user.username;
      
      // Strafe formatieren
      let strafeText = '';
      if (sanction.amount) {
        strafeText = `${sanction.amount.toLocaleString('de-DE')} Schwarzgeld`;
      }
      if (sanction.penalty) {
        strafeText = strafeText ? `${strafeText} + ${sanction.penalty}` : sanction.penalty;
      }
      if (!strafeText) {
        strafeText = 'Keine Geldstrafe';
      }

      // Frontend URL aus Settings holen
      let frontendUrl = process.env.FRONTEND_URL || 'https://lasanta.example.com';
      const sanctionLink = `${frontendUrl}/sanctions`;

      // Embed für Discord DM erstellen
      const embed = {
        title: '⚖️ SANKTION ERHALTEN',
        description: `¡HOLA ${userName}! 👋\n\nDu hast eine Sanktion erhalten.`,
        color: 0xDC2626, // Rot
        fields: [
          {
            name: '⚖️ DETAILS',
            value: `**ID:** ${sanction.id.slice(-8)}\n**Typ:** ${categoryName}\n**Verstoß:** ${sanction.description}\n**Level:** ${sanction.level}\n**Strafe:** ${strafeText}`,
            inline: false,
          },
          {
            name: '💰 ZAHLUNGSFRIST',
            value: `⚠️ **WICHTIG:** Diese Strafe muss spätestens in **48 Stunden** bei der Leaderschaft bezahlt werden!\n\n❌ Bei Nichtzahlung: **+100.000 Schwarzgeld zusätzlich**`,
            inline: false,
          },
          {
            name: '👑 ERSTELLT VON',
            value: sanction.createdBy?.username || 'System',
            inline: false,
          },
          {
            name: '🔗 Link',
            value: `[Zur Sanktionsübersicht](${sanctionLink})`,
            inline: false,
          },
        ],
        footer: {
          text: 'La Santa Calavera - Sanktionssystem',
        },
        timestamp: new Date().toISOString(),
      };

      await this.discordService.sendEmbedDirectMessage(user.discordId, embed);
      console.log(`Sanktions-DM an ${userName} (${user.discordId}) gesendet`);
    } catch (error) {
      console.error('Fehler beim Senden der Sanktions-DM:', error);
      // Fehler nicht werfen, Sanktion wurde trotzdem erstellt
    }
  }

  // Kategorie-Namen für Anzeige
  private getCategoryDisplayName(category: SanctionCategory): string {
    const names: Record<SanctionCategory, string> = {
      ABMELDUNG: 'Abmeldung',
      RESPEKTVERHALTEN: 'Respektverhalten',
      FUNKCHECK: 'Funkcheck',
      REAKTIONSPFLICHT: 'Reaktionspflicht',
      NICHT_BEZAHLT: 'Wochenabgabe nicht bezahlt',
      NICHT_BEZAHLT_48H: 'Sanktion nicht bezahlt (48h)',
      RESPEKTLOS_ZIVILISTEN: 'Respektlos gegenüber Zivilisten',
      RESPEKTLOS_FAMILIE: 'Respektlos gegenüber Familie',
      TOETUNG_FAMILIENMITGLIEDER: 'Tötung von Familienmitgliedern',
      SEXUELLE_BELAESTIGUNG: 'Sexuelle Belästigung',
      UNNOETIGES_BOXEN_SCHIESSEN: 'Unnötiges Boxen/Schießen',
      MISSACHTUNG_ANWEISUNGEN: 'Missachtung von Anweisungen',
      FEHLEN_AUFSTELLUNG: 'Fehlen bei Aufstellung',
      NICHT_ANMELDEN_FUNKCHECK: 'Nicht beim Funkcheck angemeldet',
      KLEIDERORDNUNG: 'Kleiderordnung nicht eingehalten',
      MUNITIONSVERSCHWENDUNG: 'Munitionsverschwendung',
      CASA_OHNE_ANKUENDIGUNG: 'Casa ohne Ankündigung betreten',
      FUNKPFLICHT_MISSACHTUNG: 'Funkpflicht missachtet',
      FUNKDISZIPLIN_MISSACHTUNG: 'Funkdisziplin missachtet',
      WOCHENABGABE_NICHT_ENTRICHTET: 'Wochenabgabe nicht entrichtet',
    };
    return names[category] || category;
  }

  // Sanktion als bezahlt markieren
  async paySanction(sanctionId: string) {
    const sanction = await this.prisma.sanction.findUnique({
      where: { id: sanctionId },
    });

    if (!sanction) {
      throw new NotFoundException('Sanktion nicht gefunden');
    }

    if (sanction.status !== SanctionStatus.ACTIVE) {
      throw new BadRequestException('Sanktion ist nicht aktiv');
    }

    const paidSanction = await this.prisma.sanction.update({
      where: { id: sanctionId },
      data: {
        status: SanctionStatus.PAID,
        paidAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            icFirstName: true,
            icLastName: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    // Audit-Log
    await this.auditService.log({
      userId: sanction.userId,
      action: 'SANCTION_PAY',
      entity: 'Sanction',
      entityId: sanctionId,
      meta: {
        category: sanction.category,
        level: sanction.level,
        amount: sanction.amount,
        penalty: sanction.penalty,
      },
    });

    return paidSanction;
  }

  // Recent sanctions für Live-Ticker
  async getRecentSanctions() {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    return this.prisma.sanction.findMany({
      where: {
        createdAt: {
          gte: oneWeekAgo,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            icFirstName: true,
            icLastName: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });
  }

  // Sanktion entfernen/stornieren
  async removeSanction(sanctionId: string) {
    const sanction = await this.prisma.sanction.findUnique({
      where: { id: sanctionId },
    });

    if (!sanction) {
      throw new NotFoundException('Sanktion nicht gefunden');
    }

    return this.prisma.sanction.update({
      where: { id: sanctionId },
      data: {
        status: SanctionStatus.CANCELLED,
      },
    });
  }

  // Alle Sanktionen abrufen
  async getSanctions(
    userId?: string,
    status?: SanctionStatus,
    category?: SanctionCategory
  ) {
    const where: any = {};
    
    if (userId) {
      where.userId = userId;
    }
    
    if (status) {
      where.status = status;
    }
    
    if (category) {
      where.category = category;
    }

    return this.prisma.sanction.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            icFirstName: true,
            icLastName: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // Aktive Sanktionen eines Users abrufen
  async getUserActiveSanctions(userId: string) {
    return this.prisma.sanction.findMany({
      where: {
        userId,
        status: SanctionStatus.ACTIVE,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            icFirstName: true,
            icLastName: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // Alle eigenen Sanktionen abrufen
  async getMySanctions(userId: string) {
    return this.prisma.sanction.findMany({
      where: {
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            icFirstName: true,
            icLastName: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // Abgelaufene Sanktionen bereinigen
  async cleanupExpiredSanctions() {
    const now = new Date();
    
    const expiredSanctions = await this.prisma.sanction.findMany({
      where: {
        expiresAt: {
          lt: now,
        },
        status: SanctionStatus.ACTIVE,
      },
    });

    if (expiredSanctions.length === 0) {
      return { message: 'Keine abgelaufenen Sanktionen gefunden' };
    }

    // Alle abgelaufenen Sanktionen auf EXPIRED setzen
    await this.prisma.sanction.updateMany({
      where: {
        expiresAt: {
          lt: now,
        },
        status: SanctionStatus.ACTIVE,
      },
      data: {
        status: SanctionStatus.EXPIRED,
      },
    });

    return {
      message: `${expiredSanctions.length} Sanktionen wurden als abgelaufen markiert`,
      count: expiredSanctions.length,
    };
  }

  // Statistiken
  async getSanctionStats() {
    const totalSanctions = await this.prisma.sanction.count();
    const activeSanctions = await this.prisma.sanction.count({
      where: { status: SanctionStatus.ACTIVE },
    });
    const paidSanctions = await this.prisma.sanction.count({
      where: { status: SanctionStatus.PAID },
    });
    const expiredSanctions = await this.prisma.sanction.count({
      where: { status: SanctionStatus.EXPIRED },
    });

    // Statistiken nach Kategorien
    const categoryStats = await this.prisma.sanction.groupBy({
      by: ['category'],
      _count: {
        category: true,
      },
      where: {
        status: SanctionStatus.ACTIVE,
      },
    });

    // Statistiken nach Level
    const levelStats = await this.prisma.sanction.groupBy({
      by: ['level'],
      _count: {
        level: true,
      },
      where: {
        status: SanctionStatus.ACTIVE,
      },
    });

    return {
      total: totalSanctions,
      active: activeSanctions,
      paid: paidSanctions,
      expired: expiredSanctions,
      byCategory: categoryStats,
      byLevel: levelStats,
    };
  }

  // Sanktion basierend auf Kategorie und Level berechnen
  private calculatePenalty(category: SanctionCategory, level: number): { amount?: number; penalty?: string } {
    switch (category) {
      case SanctionCategory.ABMELDUNG:
        switch (level) {
          case 1: return { amount: 50000 };
          case 2: return { amount: 150000 };
          case 3: return { amount: 300000 };
          case 4: return { amount: 500000, penalty: 'Blood Out' };
        }
        break;

      case SanctionCategory.RESPEKTVERHALTEN:
        switch (level) {
          case 1: return { amount: 75000 };
          case 2: return { amount: 150000 };
          case 3: return { amount: 300000 };
          case 4: return { amount: 500000, penalty: 'Blood Out' };
        }
        break;

      case SanctionCategory.FUNKCHECK:
        switch (level) {
          case 1: return { amount: 100000 };
          case 2: return { amount: 250000 };
          case 3: return { amount: 500000 };
          case 4: return { amount: 500000, penalty: 'Blood Out' };
        }
        break;

      case SanctionCategory.REAKTIONSPFLICHT:
        switch (level) {
          case 1: return { penalty: 'Joker' };
          case 2: return { amount: 250000 };
          case 3: return { amount: 500000 };
          case 4: return { amount: 500000, penalty: 'Blood Out' };
        }
        break;

      case SanctionCategory.NICHT_BEZAHLT:
        switch (level) {
          case 1: return { amount: 100000 };
          case 2: return { amount: 250000 };
          case 3: return { amount: 500000 };
          case 4: return { amount: 500000, penalty: 'Blood Out' };
        }
        break;

      case SanctionCategory.NICHT_BEZAHLT_48H:
        switch (level) {
          case 1: return { amount: 200000 };
          case 2: return { amount: 400000 };
          case 3: return { amount: 500000 };
          case 4: return { amount: 500000, penalty: 'Blood Out' };
        }
        break;

      case SanctionCategory.RESPEKTLOS_ZIVILISTEN:
        switch (level) {
          case 1: return { amount: 150000 };
          case 2: return { amount: 300000 };
          case 3: return { amount: 450000 };
          case 4: return { amount: 500000, penalty: 'Blood Out' };
        }
        break;

      case SanctionCategory.RESPEKTLOS_FAMILIE:
        switch (level) {
          case 1: return { amount: 75000, penalty: '1. Warnung' };
          case 2: return { amount: 150000, penalty: '2. Warnung' };
          case 3: return { amount: 300000, penalty: '3. Warnung' };
          case 4: return { amount: 500000, penalty: 'Blood Out' };
        }
        break;

      case SanctionCategory.TOETUNG_FAMILIENMITGLIEDER:
        switch (level) {
          case 1: return { amount: 130000 };
          case 2: return { amount: 260000 };
          case 3: return { amount: 400000 };
          case 4: return { amount: 500000, penalty: 'Blood Out' };
        }
        break;

      case SanctionCategory.SEXUELLE_BELAESTIGUNG:
        // Sofortiges Blood Out bei allen Levels
        switch (level) {
          case 1: return { penalty: 'Blood Out' };
          case 2: return { penalty: 'Blood Out' };
          case 3: return { penalty: 'Blood Out' };
          case 4: return { penalty: 'Blood Out' };
        }
        break;

      case SanctionCategory.UNNOETIGES_BOXEN_SCHIESSEN:
        switch (level) {
          case 1: return { amount: 75000 };
          case 2: return { amount: 150000 };
          case 3: return { amount: 300000 };
          case 4: return { amount: 500000, penalty: 'Blood Out' };
        }
        break;

      case SanctionCategory.MISSACHTUNG_ANWEISUNGEN:
        switch (level) {
          case 1: return { amount: 130000 };
          case 2: return { amount: 260000 };
          case 3: return { amount: 400000 };
          case 4: return { amount: 500000, penalty: 'Blood Out' };
        }
        break;

      case SanctionCategory.FEHLEN_AUFSTELLUNG:
        switch (level) {
          case 1: return { amount: 100000 };
          case 2: return { amount: 200000 };
          case 3: return { amount: 400000 };
          case 4: return { amount: 500000, penalty: 'Blood Out' };
        }
        break;

      case SanctionCategory.NICHT_ANMELDEN_FUNKCHECK:
        switch (level) {
          case 1: return { amount: 125000, penalty: '' };
          case 2: return { amount: 250000, penalty: '' };
          case 3: return { amount: 400000, penalty: '' };
          case 4: return { amount: 500000, penalty: 'Blood Out' };
        }
        break;

      case SanctionCategory.KLEIDERORDNUNG:
        switch (level) {
          case 1: return { amount: 75000, penalty: '' };
          case 2: return { amount: 150000, penalty: '' };
          case 3: return { amount: 300000, penalty: '' };
          case 4: return { amount: 500000, penalty: 'Blood Out' };
        }
        break;

      case SanctionCategory.MUNITIONSVERSCHWENDUNG:
        switch (level) {
          case 1: return { amount: 100000 };
          case 2: return { amount: 200000 };
          case 3: return { amount: 400000 };
          case 4: return { amount: 500000, penalty: 'Blood Out' };
        }
        break;

      case SanctionCategory.CASA_OHNE_ANKUENDIGUNG:
        switch (level) {
          case 1: return { amount: 100000 };
          case 2: return { amount: 200000 };
          case 3: return { amount: 400000 };
          case 4: return { amount: 500000, penalty: 'Blood Out' };
        }
        break;

      case SanctionCategory.FUNKPFLICHT_MISSACHTUNG:
        switch (level) {
          case 1: return { amount: 150000 };
          case 2: return { amount: 300000 };
          case 3: return { amount: 450000 };
          case 4: return { amount: 500000, penalty: 'Blood Out' };
        }
        break;

      case SanctionCategory.FUNKDISZIPLIN_MISSACHTUNG:
        switch (level) {
          case 1: return { amount: 150000 };
          case 2: return { amount: 300000 };
          case 3: return { amount: 450000 };
          case 4: return { amount: 500000, penalty: 'Blood Out' };
        }
        break;
    }

    return {};
  }

  // El Patron: Sanktions-Level für User und Kategorie zurücksetzen
  async resetUserSanctionLevels(userId: string, category: SanctionCategory, createdById: string) {
    // Alle aktiven Sanktionen für diesen User und diese Kategorie finden
    const activeSanctions = await this.prisma.sanction.findMany({
      where: {
        userId,
        category,
        status: SanctionStatus.ACTIVE,
      },
    });

    if (activeSanctions.length === 0) {
      return {
        message: 'Keine aktiven Sanktionen für diesen User und diese Kategorie gefunden',
        resetCount: 0,
      };
    }

    // Alle aktiven Sanktionen als CANCELLED markieren
    const resetResult = await this.prisma.sanction.updateMany({
      where: {
        userId,
        category,
        status: SanctionStatus.ACTIVE,
      },
      data: {
        status: SanctionStatus.CANCELLED,
        updatedAt: new Date(),
      },
    });

    return {
      message: `${resetResult.count} Sanktionen wurden zurückgesetzt`,
      resetCount: resetResult.count,
      userId,
      category,
    };
  }
}
