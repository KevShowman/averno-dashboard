import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { WeeklyDelivery, WeeklyDeliveryStatus, WeeklyDeliveryExclusion, SanctionCategory } from '@prisma/client';
import { DiscordService } from '../discord/discord.service';
import { SettingsService } from '../settings/settings.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class WeeklyDeliveryService {
  constructor(
    private prisma: PrismaService,
    private discordService: DiscordService,
    private settingsService: SettingsService,
    private auditService: AuditService,
  ) {}

  // Wochenabgabe erstellen
  async createWeeklyDelivery(userId: string, weekStart: Date, weekEnd: Date) {
    // Prüfen ob User bereits eine Abgabe für diese Woche hat
    const existingDelivery = await this.prisma.weeklyDelivery.findFirst({
      where: {
        userId,
        weekStart: {
          gte: weekStart,
        },
        weekEnd: {
          lte: weekEnd,
        },
      },
    });

    if (existingDelivery) {
      throw new BadRequestException('Wochenabgabe für diese Woche bereits vorhanden');
    }

    // Prüfen ob User von der Wochenabgabe ausgeschlossen ist
    const exclusion = await this.prisma.weeklyDeliveryExclusion.findFirst({
      where: {
        userId,
        startDate: { lte: weekEnd },
        OR: [
          { endDate: null },
          { endDate: { gte: weekStart } },
        ],
        isActive: true,
      },
    });

    if (exclusion) {
      throw new BadRequestException('User ist von der Wochenabgabe ausgeschlossen');
    }

    // Hole Wochenabgabe-Settings
    const settings = await this.settingsService.getWeeklyDeliverySettings();

    return this.prisma.weeklyDelivery.create({
      data: {
        userId,
        weekStart,
        weekEnd,
        packages: settings.packages, // Aus Settings
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

  // Wochenabgabe bezahlen
  async payWeeklyDelivery(deliveryId: string, paidAmount?: number, paidMoney?: number) {
    const delivery = await this.prisma.weeklyDelivery.findUnique({
      where: { id: deliveryId },
    });

    if (!delivery) {
      throw new NotFoundException('Wochenabgabe nicht gefunden');
    }

    if (delivery.status !== WeeklyDeliveryStatus.PENDING) {
      throw new BadRequestException('Wochenabgabe wurde bereits bezahlt');
    }

    // Mindestens eine Zahlungsmethode muss angegeben werden
    if (!paidAmount && !paidMoney) {
      throw new BadRequestException('Mindestens eine Zahlungsmethode muss angegeben werden');
    }

    // Prüfe ob vollständig bezahlt
    const totalPaidPackages = (delivery.paidAmount || 0) + (paidAmount || 0);
    const totalPaidMoney = (delivery.paidMoney || 0) + (paidMoney || 0);
    const requiredPackages = delivery.packages;
    
    // Hole Wochenabgabe-Settings für Geldberechnung
    const settings = await this.settingsService.getWeeklyDeliverySettings();
    const requiredMoney = requiredPackages * settings.moneyPerPackage;
    
    // Status basierend auf Zahlung setzen
    let newStatus: WeeklyDeliveryStatus = WeeklyDeliveryStatus.PENDING;
    if (totalPaidPackages >= requiredPackages || totalPaidMoney >= requiredMoney) {
      newStatus = WeeklyDeliveryStatus.PAID;
    } else if (totalPaidPackages > 0 || totalPaidMoney > 0) {
      newStatus = WeeklyDeliveryStatus.PARTIALLY_PAID;
    }

    const updatedDelivery = await this.prisma.weeklyDelivery.update({
      where: { id: deliveryId },
      data: {
        paidAmount: totalPaidPackages,
        paidMoney: totalPaidMoney,
        status: newStatus,
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

    // Audit-Log
    await this.auditService.log({
      userId: delivery.userId,
      action: 'WEEKLY_DELIVERY_PAY',
      entity: 'WeeklyDelivery',
      entityId: deliveryId,
      meta: {
        paidAmount,
        paidMoney,
        totalPaidPackages,
        totalPaidMoney,
        newStatus,
        weekStart: delivery.weekStart,
        weekEnd: delivery.weekEnd,
      },
    });

    return updatedDelivery;
  }

  // Wochenabgabe bestätigen
  async confirmWeeklyDelivery(deliveryId: string, confirmedById: string) {
    const delivery = await this.prisma.weeklyDelivery.findUnique({
      where: { id: deliveryId },
    });

    if (!delivery) {
      throw new NotFoundException('Wochenabgabe nicht gefunden');
    }

    if (delivery.status !== WeeklyDeliveryStatus.PAID) {
      throw new BadRequestException('Wochenabgabe muss zuerst bezahlt werden');
    }

    const confirmedDelivery = await this.prisma.weeklyDelivery.update({
      where: { id: deliveryId },
      data: {
        status: WeeklyDeliveryStatus.CONFIRMED,
        confirmedById,
        confirmedAt: new Date(),
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
        confirmedBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    // Audit-Log
    await this.auditService.log({
      userId: confirmedById,
      action: 'WEEKLY_DELIVERY_CONFIRM',
      entity: 'WeeklyDelivery',
      entityId: deliveryId,
      meta: {
        targetUserId: delivery.userId,
        weekStart: delivery.weekStart,
        weekEnd: delivery.weekEnd,
        packages: delivery.packages,
        paidAmount: delivery.paidAmount,
        paidMoney: delivery.paidMoney,
      },
    });

    return confirmedDelivery;
  }

  // Recent deliveries für Live-Ticker
  async getRecentDeliveries() {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    return this.prisma.weeklyDelivery.findMany({
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
        confirmedBy: {
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

  // Alle Wochenabgaben abrufen
  async getWeeklyDeliveries(status?: WeeklyDeliveryStatus, userId?: string, weekStart?: Date, weekEnd?: Date) {
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (userId) {
      where.userId = userId;
    }
    
    if (weekStart && weekEnd) {
      where.weekStart = {
        gte: weekStart,
        lte: weekEnd,
      };
    }

    // Hole alle aktiven Exclusions
    const activeExclusions = await this.prisma.weeklyDeliveryExclusion.findMany({
      where: {
        isActive: true,
        OR: [
          { endDate: null }, // Permanente Exclusions
          { endDate: { gte: new Date() } }, // Temporäre Exclusions, die noch aktiv sind
        ],
      },
      select: { userId: true },
    });

    const excludedUserIds = activeExclusions.map(ex => ex.userId);
    
    // Filtere excluded Users aus (nur wenn keine spezifische userId gesucht wird)
    if (excludedUserIds.length > 0 && !userId) {
      where.userId = {
        notIn: excludedUserIds,
      };
    } else if (userId && excludedUserIds.includes(userId)) {
      // Wenn die gesuchte userId excluded ist, leere Liste zurückgeben
      return [];
    }

    return this.prisma.weeklyDelivery.findMany({
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
        confirmedBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: {
        weekStart: 'desc',
      },
    });
  }

  // Aktuelle Woche abrufen
  async getCurrentWeekDeliveries() {
    const currentWeek = this.getCurrentWeek();
    
    return this.getWeeklyDeliveries(undefined, undefined, currentWeek.start, currentWeek.end);
  }

  // Ausschluss erstellen
  async createExclusion(userId: string, reason: string, startDate: Date, endDate: Date | undefined, createdById: string) {
    const exclusion = await this.prisma.weeklyDeliveryExclusion.create({
      data: {
        userId,
        reason,
        startDate,
        endDate,
        isActive: true,
        createdById,
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

    // Retrigger Index: Entferne alle aktiven Wochenabgaben für diesen User
    await this.prisma.weeklyDelivery.deleteMany({
      where: {
        userId,
        weekStart: {
          gte: startDate,
        },
        status: {
          in: [WeeklyDeliveryStatus.PENDING, WeeklyDeliveryStatus.PARTIALLY_PAID],
        },
      },
    });

    // Audit-Log
    await this.auditService.log({
      userId: createdById,
      action: 'WEEKLY_DELIVERY_EXCLUSION_CREATE',
      entity: 'WeeklyDeliveryExclusion',
      entityId: exclusion.id,
      meta: {
        targetUserId: userId,
        reason,
        startDate,
        endDate,
      },
    });

    return exclusion;
  }

  // Ausschlüsse abrufen
  async getExclusions(isActive?: boolean) {
    const where: any = {};
    
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    return this.prisma.weeklyDeliveryExclusion.findMany({
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
        startDate: 'desc',
      },
    });
  }

  // Ausschluss deaktivieren
  async deactivateExclusion(exclusionId: string) {
    return this.prisma.weeklyDeliveryExclusion.update({
      where: { id: exclusionId },
      data: {
        isActive: false,
        endDate: new Date(),
      },
    });
  }

  // Vorauszahlung für mehrere Wochen
  async prepayWeeks(userId: string, weeks: number, createdById: string, paidAmount?: number, paidMoney?: number) {
    if (weeks < 1 || weeks > 12) {
      throw new BadRequestException('Vorauszahlung kann nur für 1-12 Wochen erfolgen');
    }

    // Prüfen ob User von der Wochenabgabe ausgeschlossen ist
    const exclusion = await this.prisma.weeklyDeliveryExclusion.findFirst({
      where: {
        userId,
        isActive: true,
        startDate: { lte: new Date() },
        OR: [
          { endDate: null },
          { endDate: { gte: new Date() } },
        ],
      },
    });

    if (exclusion) {
      throw new BadRequestException('User ist von der Wochenabgabe ausgeschlossen');
    }

    // Hole Wochenabgabe-Settings
    const settings = await this.settingsService.getWeeklyDeliverySettings();

    const deliveries = [];
    const now = new Date();
    
    for (let i = 0; i < weeks; i++) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay() + 1 + (i * 7)); // Montag der Woche
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // Sonntag der Woche
      weekEnd.setHours(23, 59, 59, 999);

      // Prüfen ob bereits eine Abgabe für diese Woche existiert
      const existingDelivery = await this.prisma.weeklyDelivery.findFirst({
        where: {
          userId,
          weekStart: {
            gte: weekStart,
          },
          weekEnd: {
            lte: weekEnd,
          },
        },
      });

      if (!existingDelivery) {
        const delivery = await this.prisma.weeklyDelivery.create({
          data: {
            userId,
            weekStart,
            weekEnd,
            packages: settings.packages,
            paidAmount,
            paidMoney,
            status: WeeklyDeliveryStatus.PAID,
            isPrepaid: true,
            prepaidWeeks: weeks,
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
        deliveries.push(delivery);
      }
    }

    return deliveries;
  }

  // Alle aktiven User für Wochenabgabe indexieren
  async indexAllUsers() {
    // Erst alle Discord-Mitglieder importieren, die noch nicht in der users Tabelle sind
    await this.discordService.importDiscordMembers();
    
    // Hole Wochenabgabe-Settings
    const settings = await this.settingsService.getWeeklyDeliverySettings();
    
    const users = await this.prisma.user.findMany({
      where: {
        role: {
          not: 'GAST', // Gäste sind ausgeschlossen
        },
      },
      select: {
        id: true,
        username: true,
        icFirstName: true,
        icLastName: true,
        role: true,
      },
    });

    const currentWeek = this.getCurrentWeek();
    const indexedDeliveries = [];

    for (const user of users) {
      // Prüfen ob bereits eine Abgabe für diese Woche existiert
      const existingDelivery = await this.prisma.weeklyDelivery.findFirst({
        where: {
          userId: user.id,
          weekStart: {
            gte: currentWeek.start,
          },
          weekEnd: {
            lte: currentWeek.end,
          },
        },
      });

      if (!existingDelivery) {
        // Prüfen ob User von der Wochenabgabe ausgeschlossen ist
        const exclusion = await this.prisma.weeklyDeliveryExclusion.findFirst({
          where: {
            userId: user.id,
            isActive: true,
            startDate: { lte: currentWeek.end },
            OR: [
              { endDate: null },
              { endDate: { gte: currentWeek.start } },
            ],
          },
        });

        if (!exclusion) {
          const delivery = await this.prisma.weeklyDelivery.create({
            data: {
              userId: user.id,
              weekStart: currentWeek.start,
              weekEnd: currentWeek.end,
              packages: settings.packages,
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
          indexedDeliveries.push(delivery);
        }
      }
    }

    return {
      message: `${indexedDeliveries.length} neue Wochenabgaben erstellt`,
      deliveries: indexedDeliveries,
    };
  }

  // Automatische Sanktionierung bei nicht bezahlten Abgaben
  async autoSanctionOverdue() {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000)); // 3 Tage zurück
    
    // Überfällige Abgaben finden (älter als 3 Tage, nicht bezahlt)
    const overdueDeliveries = await this.prisma.weeklyDelivery.findMany({
      where: {
        status: WeeklyDeliveryStatus.PENDING,
        createdAt: {
          lt: threeDaysAgo,
        },
      },
      include: {
        user: true,
      },
    });

    const sanctions = [];

    for (const delivery of overdueDeliveries) {
      // Status auf OVERDUE setzen
      await this.prisma.weeklyDelivery.update({
        where: { id: delivery.id },
        data: { status: WeeklyDeliveryStatus.OVERDUE },
      });

      // Hole Wochenabgabe-Settings für Sanktions-Betrag
      const settings = await this.settingsService.getWeeklyDeliverySettings();
      const sanctionAmount = settings.packages * settings.moneyPerPackage; // Gesamtwert der Wochenabgabe

      // Sanktion erstellen
      const sanction = await this.prisma.sanction.create({
        data: {
          userId: delivery.userId,
          category: SanctionCategory.NICHT_BEZAHLT,
          level: 1,
          description: `Wochenabgabe nicht bezahlt (Woche: ${delivery.weekStart.toLocaleDateString('de-DE')} - ${delivery.weekEnd.toLocaleDateString('de-DE')})`,
          amount: sanctionAmount, // Dynamischer Betrag basierend auf Settings
          createdById: 'system', // System-Sanktion
          expiresAt: new Date(Date.now() + (28 * 24 * 60 * 60 * 1000)), // 4 Wochen
        },
      });

      sanctions.push(sanction);
    }

    return {
      message: `${sanctions.length} Sanktionen für überfällige Abgaben erstellt`,
      sanctions,
    };
  }

  // Automatischer Wochenreset (Montag 03:00 AM)
  async weeklyReset() {
    const currentWeek = this.getCurrentWeek();
    
    // Alle ausstehenden Abgaben der vorherigen Woche als überfällig markieren
    const overdueResult = await this.prisma.weeklyDelivery.updateMany({
      where: {
        status: WeeklyDeliveryStatus.PENDING,
        weekEnd: {
          lt: currentWeek.start,
        },
      },
      data: {
        status: WeeklyDeliveryStatus.OVERDUE,
      },
    });
    
    // Aktuelle Woche zurücksetzen: Alle Abgaben der aktuellen Woche löschen
    const deletedCount = await this.prisma.weeklyDelivery.deleteMany({
      where: {
        weekStart: {
          gte: currentWeek.start,
        },
        weekEnd: {
          lte: currentWeek.end,
        },
      },
    });
    
    // Alle User für die neue Woche indexieren (nur wenn noch nicht vorhanden)
    const indexResult = await this.indexAllUsers();
    
    // Automatische Sanktionierung für überfällige Abgaben
    const sanctionResult = await this.autoSanctionOverdue();

    // Audit-Log
    await this.auditService.log({
      userId: 'system',
      action: 'WEEKLY_RESET',
      entity: 'WeeklyDelivery',
      entityId: 'system',
      meta: {
        overdueCount: overdueResult.count,
        deletedCount: deletedCount.count,
        indexedCount: indexResult.deliveries?.length || 0,
        sanctionsCount: sanctionResult.sanctions?.length || 0,
        currentWeek: currentWeek,
      },
    });

    return {
      message: 'Wöchentlicher Reset durchgeführt',
      overdueCount: overdueResult.count,
      deletedCurrentWeek: deletedCount.count,
      indexed: indexResult,
      sanctions: sanctionResult,
    };
  }

  // Archivierung der aktuellen Woche
  async archiveCurrentWeek(archivedById: string) {
    const currentWeek = this.getCurrentWeek();
    
    // Alle Wochenabgaben der aktuellen Woche abrufen
    const weeklyDeliveries = await this.prisma.weeklyDelivery.findMany({
      where: {
        weekStart: {
          gte: currentWeek.start,
        },
        weekEnd: {
          lte: currentWeek.end,
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
      },
    });

    // Statistiken berechnen
    const totalDeliveries = weeklyDeliveries.length;
    const paidDeliveries = weeklyDeliveries.filter(d => d.status === 'PAID' || d.status === 'CONFIRMED').length;
    const overdueDeliveries = weeklyDeliveries.filter(d => d.status === 'OVERDUE').length;
    const pendingDeliveries = weeklyDeliveries.filter(d => d.status === 'PENDING' || d.status === 'PARTIALLY_PAID').length;
    
    const totalPackages = weeklyDeliveries.reduce((sum, d) => sum + d.packages, 0);
    const paidPackages = weeklyDeliveries
      .filter(d => d.status === 'PAID' || d.status === 'CONFIRMED')
      .reduce((sum, d) => sum + (d.paidAmount || 0), 0);
    
    const totalMoney = weeklyDeliveries.reduce((sum, d) => sum + (d.paidMoney || 0), 0);

    // Archiv-Eintrag erstellen
    const archiveName = `Woche ${currentWeek.start.toLocaleDateString('de-DE')} - ${currentWeek.end.toLocaleDateString('de-DE')}`;
    
    const archive = await this.prisma.weeklyDeliveryArchive.create({
      data: {
        weekStart: currentWeek.start,
        weekEnd: currentWeek.end,
        archiveName,
        totalDeliveries,
        paidDeliveries,
        overdueDeliveries,
        pendingDeliveries,
        totalPackages,
        paidPackages,
        totalMoney,
        archivedById,
        deliveryData: weeklyDeliveries.map(d => ({
          id: d.id,
          userId: d.userId,
          user: d.user,
          packages: d.packages,
          paidAmount: d.paidAmount,
          paidMoney: d.paidMoney,
          status: d.status,
          note: d.note,
          createdAt: d.createdAt,
          confirmedAt: d.confirmedAt,
        })),
      },
    });

    // Alle Wochenabgaben der aktuellen Woche löschen
    await this.prisma.weeklyDelivery.deleteMany({
      where: {
        weekStart: {
          gte: currentWeek.start,
        },
        weekEnd: {
          lte: currentWeek.end,
        },
      },
    });

    // Automatische Sanktionierung für überfällige Abgaben
    const sanctionResult = await this.autoSanctionOverdue();

    // Audit-Log
    await this.auditService.log({
      userId: archivedById,
      action: 'WEEKLY_DELIVERY_ARCHIVE',
      entity: 'WeeklyDeliveryArchive',
      entityId: archive.id,
      meta: {
        weekStart: currentWeek.start,
        weekEnd: currentWeek.end,
        totalDeliveries,
        paidDeliveries,
        overdueDeliveries,
        pendingDeliveries,
        totalPackages,
        paidPackages,
        totalMoney,
        sanctionsCreated: sanctionResult.sanctions?.length || 0,
      },
    });

    return {
      message: 'Woche erfolgreich archiviert',
      archive,
      sanctions: sanctionResult,
    };
  }

  // Archivierte Wochen abrufen
  async getArchives() {
    return this.prisma.weeklyDeliveryArchive.findMany({
      orderBy: {
        weekStart: 'desc',
      },
      include: {
        archivedBy: {
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

  // Archiv-Details abrufen
  async getArchiveDetails(archiveId: string) {
    const archive = await this.prisma.weeklyDeliveryArchive.findUnique({
      where: { id: archiveId },
      include: {
        archivedBy: {
          select: {
            id: true,
            username: true,
            icFirstName: true,
            icLastName: true,
          },
        },
      },
    });

    if (!archive) {
      throw new NotFoundException('Archiv nicht gefunden');
    }

    return archive;
  }

  // Development: Alle Wochenabgaben löschen
  async clearAllWeeklyDeliveries() {
    const deletedCount = await this.prisma.weeklyDelivery.deleteMany({});
    
    return {
      message: `${deletedCount.count} Wochenabgaben wurden gelöscht`,
      deletedCount: deletedCount.count,
    };
  }

  // Hilfsmethode: Aktuelle Woche berechnen
  private getCurrentWeek() {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Montag
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Sonntag
    endOfWeek.setHours(23, 59, 59, 999);

    return {
      start: startOfWeek,
      end: endOfWeek,
    };
  }

  // Statistiken
  async getWeeklyDeliveryStats() {
    const totalDeliveries = await this.prisma.weeklyDelivery.count();
    const pendingDeliveries = await this.prisma.weeklyDelivery.count({
      where: { status: WeeklyDeliveryStatus.PENDING },
    });
    const partiallyPaidDeliveries = await this.prisma.weeklyDelivery.count({
      where: { status: WeeklyDeliveryStatus.PARTIALLY_PAID },
    });
    const paidDeliveries = await this.prisma.weeklyDelivery.count({
      where: { status: WeeklyDeliveryStatus.PAID },
    });
    const confirmedDeliveries = await this.prisma.weeklyDelivery.count({
      where: { status: WeeklyDeliveryStatus.CONFIRMED },
    });
    const overdueDeliveries = await this.prisma.weeklyDelivery.count({
      where: { status: WeeklyDeliveryStatus.OVERDUE },
    });

    return {
      total: totalDeliveries,
      pending: pendingDeliveries,
      partiallyPaid: partiallyPaidDeliveries,
      paid: paidDeliveries,
      confirmed: confirmedDeliveries,
      overdue: overdueDeliveries,
    };
  }
}
