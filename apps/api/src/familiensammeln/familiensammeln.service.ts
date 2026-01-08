import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Prisma, WeeklyDeliveryStatus, ProcessorStatus } from '@prisma/client';

@Injectable()
export class FamiliensammelnService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Holt oder erstellt die Woche für ein Startdatum (Montag)
   */
  async getOrCreateWeek(weekStartDate: Date) {
    // Sicherstellen, dass es Montag 00:00:00 ist
    const weekStart = new Date(weekStartDate);
    weekStart.setHours(0, 0, 0, 0);

    // Samstag ist 5 Tage nach Montag (6 Tage insgesamt)
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 5);
    weekEnd.setHours(23, 59, 59, 999);

    // Prüfe ob Woche existiert
    let week = await this.prisma.familiensammelnWeek.findUnique({
      where: { weekStart },
      include: {
        participations: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                icFirstName: true,
                icLastName: true,
                avatarUrl: true,
                role: true,
              },
            },
          },
        },
      },
    });

    // Falls nicht, erstellen
    if (!week) {
      week = await this.prisma.familiensammelnWeek.create({
        data: {
          weekStart,
          weekEnd,
        },
        include: {
          participations: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  icFirstName: true,
                  icLastName: true,
                  avatarUrl: true,
                  role: true,
                },
              },
            },
          },
        },
      });
    }

    return week;
  }

  /**
   * Aktualisiert die Wochenabgabe für User mit 4+ Teilnahmen
   */
  private async updateWeeklyDeliveryStatus(weekId: string, weekStart: Date) {
    // Finde die Wochenabgabe-Woche (die passt zur Familiensammeln-Woche)
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6); // Wochenabgabe geht bis Sonntag

    // Hole alle Teilnahmen für diese Woche
    const participations = await this.prisma.familiensammelnParticipation.findMany({
      where: { weekId },
    });

    // Zähle Teilnahmen (Tage) und Touren pro User
    const userStats = new Map<string, { days: number; tours: number }>();
    participations.forEach((p) => {
      if (!userStats.has(p.userId)) {
        userStats.set(p.userId, { days: 0, tours: 0 });
      }
      const stats = userStats.get(p.userId)!;
      stats.days += 1;
      stats.tours += p.tourCount || 1;
    });

    // Update WeeklyDelivery für User mit 4+ Teilnahmen ODER 8+ Touren
    for (const [userId, stats] of userStats.entries()) {
      if (stats.days >= 4 || stats.tours >= 8) {
        // Finde oder erstelle WeeklyDelivery für diesen User
        const weeklyDelivery = await this.prisma.weeklyDelivery.findFirst({
          where: {
            userId,
            weekStart: {
              gte: weekStart,
              lte: weekEnd,
            },
          },
        });

        if (weeklyDelivery) {
          // Markiere als bezahlt (durch Familiensammeln)
          await this.prisma.weeklyDelivery.update({
            where: { id: weeklyDelivery.id },
            data: {
              status: WeeklyDeliveryStatus.PAID,
              paidAmount: null, // Nicht über Pakete bezahlt
              paidMoney: null, // Nicht über Geld bezahlt
              note: `Familiensammeln (${stats.days} Tag${stats.days !== 1 ? 'e' : ''}, ${stats.tours} Tour${stats.tours !== 1 ? 'en' : ''})`,
            },
          });

          console.log(`✅ Wochenabgabe für ${userId} automatisch bezahlt (${stats.days} Tage, ${stats.tours} Touren)`);
        }
      }
    }
  }

  /**
   * Fügt einen User zur Teilnahme an einem bestimmten Tag hinzu
   */
  async addParticipation(weekId: string, userId: string, date: Date) {
    // Sicherstellen, dass das Datum zur Woche gehört
    const week = await this.prisma.familiensammelnWeek.findUnique({
      where: { id: weekId },
    });

    if (!week) {
      throw new NotFoundException('Woche nicht gefunden');
    }

    // Normalisiere das Datum (00:00:00)
    const participationDate = new Date(date);
    participationDate.setHours(0, 0, 0, 0);

    // Prüfe ob Datum in Wochenbereich liegt
    if (participationDate < week.weekStart || participationDate > week.weekEnd) {
      throw new BadRequestException('Datum liegt nicht in der gewählten Woche');
    }

    // Prüfe ob User bereits an diesem Tag teilgenommen hat
    const existing = await this.prisma.familiensammelnParticipation.findUnique({
      where: {
        weekId_userId_date: {
          weekId,
          userId,
          date: participationDate,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('User hat bereits an diesem Tag teilgenommen');
    }

    // Erstelle Teilnahme
    const participation = await this.prisma.familiensammelnParticipation.create({
      data: {
        weekId,
        userId,
        date: participationDate,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            icFirstName: true,
            icLastName: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
    });

    // Update WeeklyDelivery Status
    await this.updateWeeklyDeliveryStatus(weekId, week.weekStart);

    return participation;
  }

  /**
   * Aktualisiert die Tour-Anzahl für eine Teilnahme
   */
  async updateParticipationTourCount(participationId: string, tourCount: number) {
    if (tourCount < 1) {
      throw new BadRequestException('Tour-Anzahl muss mindestens 1 sein');
    }

    const participation = await this.prisma.familiensammelnParticipation.findUnique({
      where: { id: participationId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            icFirstName: true,
            icLastName: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
    });

    if (!participation) {
      throw new NotFoundException('Teilnahme nicht gefunden');
    }

    // Update tourCount
    const updated = await this.prisma.familiensammelnParticipation.update({
      where: { id: participationId },
      data: { tourCount },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            icFirstName: true,
            icLastName: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
    });

    // Update WeeklyDelivery Status (falls sich durch die Änderung etwas ändert)
    const week = await this.prisma.familiensammelnWeek.findUnique({
      where: { id: participation.weekId },
    });

    if (week) {
      await this.updateWeeklyDeliveryStatus(participation.weekId, week.weekStart);
    }

    return updated;
  }

  /**
   * Entfernt eine Teilnahme
   */
  async removeParticipation(participationId: string) {
    const participation = await this.prisma.familiensammelnParticipation.findUnique({
      where: { id: participationId },
    });

    if (!participation) {
      throw new NotFoundException('Teilnahme nicht gefunden');
    }

    await this.prisma.familiensammelnParticipation.delete({
      where: { id: participationId },
    });

    // Update WeeklyDelivery Status
    const week = await this.prisma.familiensammelnWeek.findUnique({
      where: { id: participation.weekId },
    });

    if (week) {
      await this.updateWeeklyDeliveryStatus(participation.weekId, week.weekStart);
    }

    return { message: 'Teilnahme entfernt' };
  }

  /**
   * Statistik: Zeige an, wer noch wie viele Tage teilnehmen muss
   */
  async getWeekStatistics(weekId: string) {
    const week = await this.prisma.familiensammelnWeek.findUnique({
      where: { id: weekId },
      include: {
        participations: true,
      },
    });

    if (!week) {
      throw new NotFoundException('Woche nicht gefunden');
    }

    // Hole alle aktiven User (keine Partner/Taxi - nur interne Mitglieder)
    const allUsers = await this.prisma.user.findMany({
      where: {
        isPartner: false,
        isTaxi: false,
      },
      select: {
        id: true,
        username: true,
        icFirstName: true,
        icLastName: true,
        avatarUrl: true,
        role: true,
      },
    });

    // Hole alle aktiven Exclusions für diese Woche
    const activeExclusions = await this.prisma.weeklyDeliveryExclusion.findMany({
      where: {
        isActive: true,
        startDate: { lte: week.weekEnd },
        OR: [
          { endDate: null },
          { endDate: { gte: week.weekStart } },
        ],
      },
      select: {
        userId: true,
      },
    });

    const excludedUserIds = new Set(activeExclusions.map(e => e.userId));

    // Filtere ausgeschlossene User aus
    const eligibleUsers = allUsers.filter(user => !excludedUserIds.has(user.id));

    // Zähle Teilnahmen (Tage) und Touren pro User
    const userParticipationCount = new Map<string, number>();
    const userTourCount = new Map<string, number>();
    
    week.participations.forEach((p) => {
      // Zähle Tage
      const dayCount = userParticipationCount.get(p.userId) || 0;
      userParticipationCount.set(p.userId, dayCount + 1);
      
      // Zähle Touren (summiere tourCount)
      const tourCount = userTourCount.get(p.userId) || 0;
      userTourCount.set(p.userId, tourCount + (p.tourCount || 1));
    });

    // Erstelle Statistik (nur für nicht-ausgeschlossene User)
    const statistics = eligibleUsers.map((user) => {
      const participationCount = userParticipationCount.get(user.id) || 0;
      const totalTours = userTourCount.get(user.id) || 0;
      const remainingDays = Math.max(0, 4 - participationCount);
      const remainingTours = Math.max(0, 8 - totalTours);
      // User muss zahlen, wenn WEDER 4+ Tage NOCH 8+ Touren erreicht
      const mustPayWeeklyDelivery = participationCount < 4 && totalTours < 8;
      // User hat bestanden, wenn ENTWEDER 4+ Tage ODER 8+ Touren erreicht
      const hasPassed = participationCount >= 4 || totalTours >= 8;

      return {
        user,
        participationCount, // Anzahl der Tage
        totalTours, // Gesamtzahl der Touren
        remainingDays,
        remainingTours,
        mustPayWeeklyDelivery,
        hasPassed,
      };
    });

    return {
      week: {
        id: week.id,
        weekStart: week.weekStart,
        weekEnd: week.weekEnd,
      },
      statistics: statistics.sort((a, b) => b.participationCount - a.participationCount),
    };
  }

  /**
   * Holt die aktuelle Woche
   */
  async getCurrentWeek() {
    const now = new Date();
    const weekStart = this.getMondayOfWeek(now);
    return this.getOrCreateWeek(weekStart);
  }

  /**
   * Berechnet den Montag der aktuellen Woche
   */
  private getMondayOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Montag
    return new Date(d.setDate(diff));
  }

  /**
   * Holt eine Woche mit allen Details
   */
  async getWeek(weekId: string) {
    const week = await this.prisma.familiensammelnWeek.findUnique({
      where: { id: weekId },
      include: {
        participations: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                icFirstName: true,
                icLastName: true,
                avatarUrl: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!week) {
      throw new NotFoundException('Woche nicht gefunden');
    }

    return week;
  }

  /**
   * Holt alle Wochen (für Archiv)
   */
  async getAllWeeks(limit = 10) {
    return this.prisma.familiensammelnWeek.findMany({
      orderBy: { weekStart: 'desc' },
      take: limit,
      include: {
        participations: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                icFirstName: true,
                icLastName: true,
                avatarUrl: true,
                role: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Gesamtstatistik: Leaderboard und accumulated stats über alle Wochen
   */
  async getAllTimeStatistics() {
    // Hole alle Participations mit User-Daten
    const allParticipations = await this.prisma.familiensammelnParticipation.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            icFirstName: true,
            icLastName: true,
            avatarUrl: true,
            role: true,
          },
        },
        week: {
          select: {
            weekStart: true,
            weekEnd: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Zähle pro User: Tage, Touren, Wochen
    const userStats = new Map<string, {
      user: any;
      totalDays: number;
      totalTours: number;
      weeksParticipated: Set<string>;
      lastParticipation: Date;
    }>();

    allParticipations.forEach((p) => {
      if (!userStats.has(p.userId)) {
        userStats.set(p.userId, {
          user: p.user,
          totalDays: 0,
          totalTours: 0,
          weeksParticipated: new Set(),
          lastParticipation: p.createdAt,
        });
      }

      const stats = userStats.get(p.userId)!;
      stats.totalDays += 1;
      stats.totalTours += p.tourCount || 1;
      stats.weeksParticipated.add(p.weekId);
      
      // Update last participation if more recent
      if (p.createdAt > stats.lastParticipation) {
        stats.lastParticipation = p.createdAt;
      }
    });

    // Konvertiere zu Array und sortiere nach Touren
    const leaderboard = Array.from(userStats.values())
      .map((stat) => ({
        user: stat.user,
        totalDays: stat.totalDays,
        totalTours: stat.totalTours,
        weeksParticipated: stat.weeksParticipated.size,
        lastParticipation: stat.lastParticipation,
        averageToursPerDay: stat.totalDays > 0 ? (stat.totalTours / stat.totalDays).toFixed(2) : '0',
      }))
      .sort((a, b) => b.totalTours - a.totalTours);

    // Gesamtstatistik
    const totalStats = {
      totalParticipations: allParticipations.length,
      totalTours: allParticipations.reduce((sum, p) => sum + (p.tourCount || 1), 0),
      totalWeeks: await this.prisma.familiensammelnWeek.count(),
      activeUsers: userStats.size,
      averageToursPerParticipation: allParticipations.length > 0 
        ? (allParticipations.reduce((sum, p) => sum + (p.tourCount || 1), 0) / allParticipations.length).toFixed(2)
        : '0',
    };

    return {
      leaderboard,
      totalStats,
    };
  }

  /**
   * Startet einen neuen Verarbeiter für einen User
   * Kapazität: 3000, Verarbeitungsrate: 10/min → 300 min = 5 Stunden
   */
  async startProcessor(weekId: string, userId: string) {
    // Prüfe ob Woche existiert
    const week = await this.prisma.familiensammelnWeek.findUnique({
      where: { id: weekId },
    });

    if (!week) {
      throw new NotFoundException('Woche nicht gefunden');
    }

    // Prüfe ob User bereits einen aktiven Verarbeiter hat
    const existingProcessor = await this.prisma.familiensammelnProcessor.findFirst({
      where: {
        weekId,
        userId,
        status: {
          in: [ProcessorStatus.PROCESSING, ProcessorStatus.FINISHED],
        },
      },
    });

    if (existingProcessor) {
      throw new BadRequestException('User hat bereits einen aktiven Verarbeiter');
    }

    // Berechne Endzeit: 3000 / 10 = 300 Minuten = 5 Stunden
    const startedAt = new Date();
    const finishesAt = new Date(startedAt.getTime() + 5 * 60 * 60 * 1000); // +5 Stunden

    // Erstelle Verarbeiter
    const processor = await this.prisma.familiensammelnProcessor.create({
      data: {
        weekId,
        userId,
        startedAt,
        finishesAt,
        capacity: 3000,
        processingRate: 10,
        status: ProcessorStatus.PROCESSING,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            icFirstName: true,
            icLastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return processor;
  }

  /**
   * Holt alle Verarbeiter für eine Woche
   */
  async getProcessors(weekId: string) {
    const processors = await this.prisma.familiensammelnProcessor.findMany({
      where: { weekId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            icFirstName: true,
            icLastName: true,
            avatarUrl: true,
          },
        },
        completedByUser: {
          select: {
            id: true,
            username: true,
            icFirstName: true,
            icLastName: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    // Auto-Update Status: Wenn finishesAt < jetzt und status PROCESSING → setze auf FINISHED
    const now = new Date();
    const processorPromises = processors.map(async (p) => {
      if (p.status === ProcessorStatus.PROCESSING && p.finishesAt <= now) {
        return this.prisma.familiensammelnProcessor.update({
          where: { id: p.id },
          data: { status: ProcessorStatus.FINISHED },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                icFirstName: true,
                icLastName: true,
                avatarUrl: true,
              },
            },
            completedByUser: {
              select: {
                id: true,
                username: true,
                icFirstName: true,
                icLastName: true,
              },
            },
          },
        });
      }
      return p;
    });

    return Promise.all(processorPromises);
  }

  /**
   * Bestätigt die Entnahme eines Verarbeiters
   */
  async completeProcessor(processorId: string, completedBy: string) {
    const processor = await this.prisma.familiensammelnProcessor.findUnique({
      where: { id: processorId },
    });

    if (!processor) {
      throw new NotFoundException('Verarbeiter nicht gefunden');
    }

    if (processor.status === ProcessorStatus.COMPLETED) {
      throw new BadRequestException('Verarbeiter wurde bereits abgeschlossen');
    }

    // Status auf FINISHED setzen falls noch PROCESSING
    const now = new Date();
    let status = processor.status;
    if (processor.finishesAt <= now || status === ProcessorStatus.PROCESSING) {
      status = ProcessorStatus.FINISHED;
    }

    // Update zu COMPLETED
    const updated = await this.prisma.familiensammelnProcessor.update({
      where: { id: processorId },
      data: {
        status: ProcessorStatus.COMPLETED,
        completedAt: now,
        completedBy,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            icFirstName: true,
            icLastName: true,
            avatarUrl: true,
          },
        },
        completedByUser: {
          select: {
            id: true,
            username: true,
            icFirstName: true,
            icLastName: true,
          },
        },
      },
    });

    return updated;
  }

  /**
   * Löscht einen Verarbeiter
   */
  async deleteProcessor(processorId: string) {
    const processor = await this.prisma.familiensammelnProcessor.findUnique({
      where: { id: processorId },
    });

    if (!processor) {
      throw new NotFoundException('Verarbeiter nicht gefunden');
    }

    await this.prisma.familiensammelnProcessor.delete({
      where: { id: processorId },
    });

    return { success: true };
  }
}

