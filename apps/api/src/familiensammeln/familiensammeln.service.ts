import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Prisma, WeeklyDeliveryStatus } from '@prisma/client';

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
   * Aktualisiert die Wochenabgabe für User mit 3+ Teilnahmen
   */
  private async updateWeeklyDeliveryStatus(weekId: string, weekStart: Date) {
    // Finde die Wochenabgabe-Woche (die passt zur Familiensammeln-Woche)
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6); // Wochenabgabe geht bis Sonntag

    // Hole alle Teilnahmen für diese Woche
    const participations = await this.prisma.familiensammelnParticipation.findMany({
      where: { weekId },
    });

    // Zähle Teilnahmen pro User
    const userParticipationCount = new Map<string, number>();
    participations.forEach((p) => {
      const count = userParticipationCount.get(p.userId) || 0;
      userParticipationCount.set(p.userId, count + 1);
    });

    // Update WeeklyDelivery für User mit 3+ Teilnahmen
    for (const [userId, count] of userParticipationCount.entries()) {
      if (count >= 3) {
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
              paidAmount: 300, // Vollständig bezahlt
              note: `Automatisch bezahlt: ${count} Tage Familiensammeln`,
            },
          });

          console.log(`✅ Wochenabgabe für ${userId} automatisch bezahlt (${count} Tage Familiensammeln)`);
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

    // Hole alle aktiven User
    const allUsers = await this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        icFirstName: true,
        icLastName: true,
        avatarUrl: true,
        role: true,
      },
    });

    // Zähle Teilnahmen pro User
    const userParticipationCount = new Map<string, number>();
    week.participations.forEach((p) => {
      const count = userParticipationCount.get(p.userId) || 0;
      userParticipationCount.set(p.userId, count + 1);
    });

    // Erstelle Statistik
    const statistics = allUsers.map((user) => {
      const participationCount = userParticipationCount.get(user.id) || 0;
      const remainingDays = Math.max(0, 3 - participationCount);
      const mustPayWeeklyDelivery = participationCount < 3;

      return {
        user,
        participationCount,
        remainingDays,
        mustPayWeeklyDelivery,
        hasPassed: participationCount >= 3,
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
}

