import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { WeeklyDelivery, WeeklyDeliveryStatus, WeeklyDeliveryExclusion } from '@prisma/client';

@Injectable()
export class WeeklyDeliveryService {
  constructor(private prisma: PrismaService) {}

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

    return this.prisma.weeklyDelivery.create({
      data: {
        userId,
        weekStart,
        weekEnd,
        packages: 300, // Standard: 300 Kokain-Pakete
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

    return this.prisma.weeklyDelivery.update({
      where: { id: deliveryId },
      data: {
        paidAmount,
        paidMoney,
        status: WeeklyDeliveryStatus.PAID,
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

    return this.prisma.weeklyDelivery.update({
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
  }

  // Alle Wochenabgaben abrufen
  async getWeeklyDeliveries(status?: WeeklyDeliveryStatus, userId?: string) {
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (userId) {
      where.userId = userId;
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
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Montag
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Sonntag
    endOfWeek.setHours(23, 59, 59, 999);

    return this.prisma.weeklyDelivery.findMany({
      where: {
        weekStart: {
          gte: startOfWeek,
        },
        weekEnd: {
          lte: endOfWeek,
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
        createdAt: 'asc',
      },
    });
  }

  // Ausschluss erstellen
  async createExclusion(userId: string, reason: string, startDate: Date, createdById: string, endDate?: Date) {
    return this.prisma.weeklyDeliveryExclusion.create({
      data: {
        userId,
        reason,
        startDate,
        endDate,
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

  // Statistiken
  async getWeeklyDeliveryStats() {
    const totalDeliveries = await this.prisma.weeklyDelivery.count();
    const pendingDeliveries = await this.prisma.weeklyDelivery.count({
      where: { status: WeeklyDeliveryStatus.PENDING },
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
      paid: paidDeliveries,
      confirmed: confirmedDeliveries,
      overdue: overdueDeliveries,
    };
  }
}
