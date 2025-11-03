import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Role } from '@prisma/client';
import { AbmeldungWebhookService } from './discord-webhook.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AbmeldungService {
  constructor(
    private prisma: PrismaService,
    private webhookService: AbmeldungWebhookService,
    private auditService: AuditService,
  ) {}

  // Erstelle neue Abmeldung
  async createAbmeldung(
    userId: string,
    startDate: Date,
    endDate: Date,
    reason?: string,
  ) {
    // Validierung: startDate darf nicht nach endDate liegen (gleich ist OK für einzelne Tage)
    if (startDate > endDate) {
      throw new BadRequestException('Startdatum darf nicht nach dem Enddatum liegen');
    }

    // Prüfe auf überlappende Abmeldungen
    const overlapping = await this.prisma.abmeldung.findFirst({
      where: {
        userId,
        OR: [
          {
            AND: [
              { startDate: { lte: startDate } },
              { endDate: { gte: startDate } },
            ],
          },
          {
            AND: [
              { startDate: { lte: endDate } },
              { endDate: { gte: endDate } },
            ],
          },
          {
            AND: [
              { startDate: { gte: startDate } },
              { endDate: { lte: endDate } },
            ],
          },
        ],
      },
    });

    if (overlapping) {
      throw new BadRequestException('Es existiert bereits eine Abmeldung für diesen Zeitraum');
    }

    const abmeldung = await this.prisma.abmeldung.create({
      data: {
        userId,
        startDate,
        endDate,
        reason,
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
      },
    });

    // Retrospektive Anwendung: Aufstellungen im Zeitraum automatisch auf NOT_COMING setzen
    await this.applyAbmeldungToAufstellungen(userId, startDate, endDate);

    // Retrospektive Anwendung: Markiere Wochenabgaben als "Abgemeldet" (persistent)
    await this.markWeeklyDeliveriesAsAbgemeldet(userId, startDate, endDate);

    // Sende Discord-Benachrichtigung
    try {
      await this.webhookService.sendAbmeldungNotification(abmeldung);
    } catch (error) {
      console.error('Fehler beim Senden der Discord-Benachrichtigung:', error);
      // Fehler nicht werfen, Abmeldung wurde trotzdem erstellt
    }

    // Audit Log
    await this.auditService.log({
      userId,
      action: 'ABMELDUNG_CREATED',
      entity: 'Abmeldung',
      entityId: abmeldung.id,
      meta: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        reason: reason || null,
      },
    });

    return abmeldung;
  }

  // Retrospektiv: Markiere Wochenabgaben persistent als "Abgemeldet"
  private async markWeeklyDeliveriesAsAbgemeldet(
    userId: string,
    startDate: Date,
    endDate: Date,
  ) {
    // Finde alle WeeklyDeliveries für diesen User, die sich mit der Abmeldung überschneiden
    const deliveries = await this.prisma.weeklyDelivery.findMany({
      where: {
        userId,
        OR: [
          {
            // Delivery Start liegt im Abmeldung-Zeitraum
            weekStart: {
              gte: startDate,
              lte: endDate,
            },
          },
          {
            // Delivery End liegt im Abmeldung-Zeitraum
            weekEnd: {
              gte: startDate,
              lte: endDate,
            },
          },
          {
            // Abmeldung liegt komplett innerhalb der Delivery
            AND: [
              { weekStart: { lte: startDate } },
              { weekEnd: { gte: endDate } },
            ],
          },
        ],
      },
    });

    for (const delivery of deliveries) {
      // Berechne wie viele Tage der Abmeldung sich mit dieser Woche überschneiden
      const overlapStart = delivery.weekStart > startDate ? delivery.weekStart : startDate;
      const overlapEnd = delivery.weekEnd < endDate ? delivery.weekEnd : endDate;
      
      const overlapMs = overlapEnd.getTime() - overlapStart.getTime();
      const overlapDays = Math.ceil(overlapMs / (1000 * 60 * 60 * 24)) + 1;

      // Wenn >2 Tage abgemeldet, markiere persistent als "Abgemeldet"
      if (overlapDays > 2) {
        await this.prisma.weeklyDelivery.update({
          where: { id: delivery.id },
          data: {
            isAbgemeldet: true,
            abgemeldeteDays: overlapDays,
          },
        });

        console.log(`✅ WeeklyDelivery ${delivery.id} markiert als Abgemeldet (${overlapDays} Tage)`);
      }
    }
  }

  // Retrospektiv: Setze User bei Aufstellungen im Zeitraum auf NOT_COMING
  private async applyAbmeldungToAufstellungen(
    userId: string,
    startDate: Date,
    endDate: Date,
  ) {
    // Finde alle Aufstellungen im Zeitraum
    const aufstellungen = await this.prisma.aufstellung.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        date: true,
      },
    });

    for (const aufstellung of aufstellungen) {
      // Prüfe ob bereits eine Response existiert
      const existingResponse = await this.prisma.aufstellungResponse.findUnique({
        where: {
          aufstellungId_userId: {
            aufstellungId: aufstellung.id,
            userId,
          },
        },
      });

      // Nur setzen wenn noch keine Response existiert (kein Override)
      if (!existingResponse) {
        await this.prisma.aufstellungResponse.create({
          data: {
            aufstellungId: aufstellung.id,
            userId,
            status: 'NOT_COMING',
          },
        });
      }
    }
  }

  // Alle Abmeldungen abrufen
  async getAllAbmeldungen() {
    return this.prisma.abmeldung.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            icFirstName: true,
            icLastName: true,
            role: true,
          },
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    });
  }

  // Aktuelle Abmeldungen (nur die, die JETZT gerade aktiv sind)
  async getCurrentAbmeldungen() {
    const now = new Date();
    
    return this.prisma.abmeldung.findMany({
      where: {
        AND: [
          {
            startDate: {
              lte: now, // Bereits begonnen
            },
          },
          {
            endDate: {
              gte: now, // Noch nicht vorbei
            },
          },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            icFirstName: true,
            icLastName: true,
            role: true,
          },
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    });
  }

  // Meine Abmeldungen
  async getMyAbmeldungen(userId: string) {
    return this.prisma.abmeldung.findMany({
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
      },
      orderBy: {
        startDate: 'desc',
      },
    });
  }

  // Prüfe ob User zu einem bestimmten Zeitpunkt abgemeldet ist
  async isUserAbgemeldet(userId: string, date: Date): Promise<boolean> {
    const abmeldung = await this.prisma.abmeldung.findFirst({
      where: {
        userId,
        startDate: { lte: date },
        endDate: { gte: date },
      },
    });

    return !!abmeldung;
  }

  // Prüfe ob User für Zeitraum abgemeldet ist (>50% der Tage)
  async isUserAbgemeldetForPeriod(
    userId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<{ isAbgemeldet: boolean; abgemeldeteDays: number; totalDays: number }> {
    const abmeldungen = await this.prisma.abmeldung.findMany({
      where: {
        userId,
        OR: [
          {
            AND: [
              { startDate: { lte: periodStart } },
              { endDate: { gte: periodStart } },
            ],
          },
          {
            AND: [
              { startDate: { lte: periodEnd } },
              { endDate: { gte: periodEnd } },
            ],
          },
          {
            AND: [
              { startDate: { gte: periodStart } },
              { endDate: { lte: periodEnd } },
            ],
          },
        ],
      },
    });

    // Berechne Anzahl abgemeldeter Tage
    const totalDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
    let abgemeldeteDays = 0;

    for (const abmeldung of abmeldungen) {
      const start = abmeldung.startDate > periodStart ? abmeldung.startDate : periodStart;
      const end = abmeldung.endDate < periodEnd ? abmeldung.endDate : periodEnd;
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      abgemeldeteDays += days;
    }

    // User ist abgemeldet wenn >2 Tage
    const isAbgemeldet = abgemeldeteDays > 2;

    return {
      isAbgemeldet,
      abgemeldeteDays,
      totalDays,
    };
  }

  // Abmeldung löschen
  async deleteAbmeldung(abmeldungId: string, userId: string, userRole: Role) {
    const abmeldung = await this.prisma.abmeldung.findUnique({
      where: { id: abmeldungId },
      include: {
        user: true,
      },
    });

    if (!abmeldung) {
      throw new NotFoundException('Abmeldung nicht gefunden');
    }

    // Prüfe Berechtigung: Nur eigene Abmeldungen oder Leaderschaft
    const isLeadership = ([Role.EL_PATRON, Role.DON, Role.ASESOR] as Role[]).includes(userRole);
    const isOwnAbmeldung = abmeldung.userId === userId;

    if (!isLeadership && !isOwnAbmeldung) {
      throw new ForbiddenException('Keine Berechtigung zum Löschen dieser Abmeldung');
    }

    await this.prisma.abmeldung.delete({
      where: { id: abmeldungId },
    });

    // Audit Log
    await this.auditService.log({
      userId,
      action: 'ABMELDUNG_DELETED',
      entity: 'Abmeldung',
      entityId: abmeldungId,
      meta: {
        deletedUserId: abmeldung.userId,
        startDate: abmeldung.startDate.toISOString(),
        endDate: abmeldung.endDate.toISOString(),
      },
    });

    return { message: 'Abmeldung wurde gelöscht' };
  }

  // Abmeldung aktualisieren
  async updateAbmeldung(
    abmeldungId: string,
    userId: string,
    userRole: Role,
    startDate?: Date,
    endDate?: Date,
    reason?: string,
  ) {
    const abmeldung = await this.prisma.abmeldung.findUnique({
      where: { id: abmeldungId },
    });

    if (!abmeldung) {
      throw new NotFoundException('Abmeldung nicht gefunden');
    }

    // Prüfe Berechtigung
    const isLeadership = ([Role.EL_PATRON, Role.DON, Role.ASESOR] as Role[]).includes(userRole);
    const isOwnAbmeldung = abmeldung.userId === userId;

    if (!isLeadership && !isOwnAbmeldung) {
      throw new ForbiddenException('Keine Berechtigung zum Bearbeiten dieser Abmeldung');
    }

    // Validierung
    const newStartDate = startDate || abmeldung.startDate;
    const newEndDate = endDate || abmeldung.endDate;

    if (newStartDate > newEndDate) {
      throw new BadRequestException('Startdatum darf nicht nach dem Enddatum liegen');
    }

    return this.prisma.abmeldung.update({
      where: { id: abmeldungId },
      data: {
        startDate: newStartDate,
        endDate: newEndDate,
        reason: reason !== undefined ? reason : abmeldung.reason,
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
      },
    });
  }

  // Abgelaufene Abmeldungen bereinigen (älter als 90 Tage)
  async cleanupOldAbmeldungen() {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const result = await this.prisma.abmeldung.deleteMany({
      where: {
        endDate: {
          lt: ninetyDaysAgo,
        },
      },
    });

    return {
      message: `${result.count} abgelaufene Abmeldungen wurden gelöscht`,
      count: result.count,
    };
  }
}

