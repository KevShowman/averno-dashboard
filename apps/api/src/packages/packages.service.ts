import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Role, DepositStatus, WeeklyDeliveryStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class PackagesService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private settingsService: SettingsService,
  ) {}

  async createDeposit(userId: string, packages: number, note?: string) {
    if (packages <= 0) {
      throw new BadRequestException('Anzahl der Pakete muss größer als 0 sein');
    }

    const deposit = await this.prisma.packageDeposit.create({
      data: {
        userId,
        packages,
        note,
        status: DepositStatus.PENDING,
        weeklyDeliveryPackages: null,
        payoutPackages: packages,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    await this.auditService.log({
      userId,
      action: 'PACKAGE_DEPOSIT_CREATED',
      entity: 'PackageDeposit',
      entityId: deposit.id,
      meta: {
        packages,
        note,
      },
    });

    return deposit;
  }

  // Prüfen ob User eine ausstehende Wochenabgabe hat
  async checkPendingWeeklyDelivery(userId: string) {
    const currentWeek = this.getCurrentWeek();
    
    const pendingDelivery = await this.prisma.weeklyDelivery.findFirst({
      where: {
        userId,
        status: {
          in: [WeeklyDeliveryStatus.PENDING, WeeklyDeliveryStatus.PARTIALLY_PAID],
        },
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
        packageDeposits: {
          where: {
            status: DepositStatus.CONFIRMED,
          },
          select: {
            weeklyDeliveryPackages: true,
          },
        },
      },
    });

    return pendingDelivery;
  }

  // Package-Deposit mit Wochenabgabe-Integration erstellen
  async createDepositWithWeeklyDelivery(
    userId: string, 
    packages: number, 
    note?: string,
    useForWeeklyDelivery: boolean = false,
    weeklyDeliveryId?: string
  ) {
    if (packages <= 0) {
      throw new BadRequestException('Anzahl der Pakete muss größer als 0 sein');
    }

    let weeklyDeliveryPackages = 0;
    let payoutPackages = packages;

    if (useForWeeklyDelivery && weeklyDeliveryId) {
      const weeklyDelivery = await this.prisma.weeklyDelivery.findUnique({
        where: { id: weeklyDeliveryId },
      });

      if (!weeklyDelivery || weeklyDelivery.userId !== userId) {
        throw new BadRequestException('Wochenabgabe nicht gefunden oder nicht berechtigt');
      }

      if (weeklyDelivery.status === WeeklyDeliveryStatus.PAID || weeklyDelivery.status === WeeklyDeliveryStatus.CONFIRMED) {
        throw new BadRequestException('Wochenabgabe wurde bereits vollständig bezahlt');
      }

      // Hole Wochenabgabe-Settings für Berechnung
      const settings = await this.settingsService.getWeeklyDeliverySettings();
      
      // Berechne noch benötigte Pakete für Wochenabgabe
      const alreadyPaid = weeklyDelivery.paidAmount || 0;
      const remainingRequired = Math.max(0, settings.packages - alreadyPaid);
      
      // Verwende nur die benötigten Pakete für Wochenabgabe
      weeklyDeliveryPackages = Math.min(packages, remainingRequired);
      payoutPackages = Math.max(0, packages - weeklyDeliveryPackages);

      // Wochenabgabe Status basierend auf Gesamtpaketen setzen
      let newStatus: WeeklyDeliveryStatus = WeeklyDeliveryStatus.PENDING;
      const totalPaid = alreadyPaid + weeklyDeliveryPackages;
      if (totalPaid >= settings.packages) {
        newStatus = WeeklyDeliveryStatus.PAID;
      } else if (totalPaid > 0) {
        newStatus = WeeklyDeliveryStatus.PARTIALLY_PAID;
      }

      // Wochenabgabe wird erst bei Bestätigung des Deposits aktualisiert
      // Hier nur die Berechnung für den Deposit speichern
    }

    const deposit = await this.prisma.packageDeposit.create({
      data: {
        userId,
        packages,
        note,
        status: DepositStatus.PENDING,
        weeklyDeliveryId: useForWeeklyDelivery ? weeklyDeliveryId : null,
        weeklyDeliveryPackages: useForWeeklyDelivery ? (weeklyDeliveryPackages > 0 ? weeklyDeliveryPackages : null) : null,
        payoutPackages: useForWeeklyDelivery ? payoutPackages : packages,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        weeklyDelivery: {
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
        },
      },
    });

    await this.auditService.log({
      userId,
      action: 'PACKAGE_DEPOSIT_CREATED',
      entity: 'PackageDeposit',
      entityId: deposit.id,
      meta: {
        packages,
        note,
        weeklyDeliveryPackages,
        payoutPackages,
        useForWeeklyDelivery,
      },
    });

    return deposit;
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

  async getPendingDeposits() {
    return this.prisma.packageDeposit.findMany({
      where: {
        status: DepositStatus.PENDING,
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
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async getConfirmedDeposits() {
    return this.prisma.packageDeposit.findMany({
      where: {
        status: DepositStatus.CONFIRMED,
        uebergabeId: null, // Nur Deposits der aktuellen Übergabe (nicht archiviert)
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
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
        confirmedAt: 'desc',
      },
    });
  }

  async confirmDeposit(depositId: string, confirmedById: string) {
    const deposit = await this.prisma.packageDeposit.findUnique({
      where: { id: depositId },
      include: { 
        user: true,
        weeklyDelivery: true,
      },
    });

    if (!deposit) {
      throw new BadRequestException('Deposit nicht gefunden');
    }

    if (deposit.status !== DepositStatus.PENDING) {
      throw new BadRequestException('Deposit wurde bereits bearbeitet');
    }

    // Wenn der Deposit mit einer Wochenabgabe verknüpft ist, aktualisiere diese
    if (deposit.weeklyDeliveryId && deposit.weeklyDelivery) {
      const weeklyDelivery = deposit.weeklyDelivery;
      
      // Berechne neue Status basierend auf allen bestätigten Deposits für diese Wochenabgabe
      const allConfirmedDeposits = await this.prisma.packageDeposit.findMany({
        where: {
          weeklyDeliveryId: deposit.weeklyDeliveryId,
          status: DepositStatus.CONFIRMED,
        },
      });
      
      // Füge die Pakete des aktuell bestätigten Deposits hinzu
      const totalConfirmedPackages = allConfirmedDeposits.reduce(
        (sum, d) => sum + (d.weeklyDeliveryPackages || 0), 
        0
      ) + (deposit.weeklyDeliveryPackages || 0);
      
      let newStatus: WeeklyDeliveryStatus = WeeklyDeliveryStatus.PENDING;
      if (totalConfirmedPackages >= weeklyDelivery.packages) {
        newStatus = WeeklyDeliveryStatus.PAID;
      } else if (totalConfirmedPackages > 0) {
        newStatus = WeeklyDeliveryStatus.PARTIALLY_PAID;
      }
      
      // Aktualisiere Wochenabgabe
      await this.prisma.weeklyDelivery.update({
        where: { id: deposit.weeklyDeliveryId },
        data: {
          status: newStatus,
          paidAmount: totalConfirmedPackages,
        },
      });
    }

    const confirmedDeposit = await this.prisma.packageDeposit.update({
      where: { id: depositId },
      data: {
        status: DepositStatus.CONFIRMED,
        confirmedById,
        confirmedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        confirmedBy: {
          select: {
            id: true,
            username: true,
          },
        },
        weeklyDelivery: {
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
        },
      },
    });

    await this.auditService.log({
      userId: confirmedById,
      action: 'PACKAGE_DEPOSIT_CONFIRMED',
      entity: 'PackageDeposit',
      entityId: depositId,
      meta: {
        packages: deposit.packages,
        depositUser: deposit.user.username,
        weeklyDeliveryId: deposit.weeklyDeliveryId,
        weeklyDeliveryPackages: deposit.weeklyDeliveryPackages,
      },
    });

    return confirmedDeposit;
  }

  async rejectDeposit(depositId: string, rejectedById: string, reason?: string) {
    const deposit = await this.prisma.packageDeposit.findUnique({
      where: { id: depositId },
      include: {
        weeklyDelivery: true,
      },
    });

    if (!deposit) {
      throw new BadRequestException('Deposit nicht gefunden');
    }

    if (deposit.status !== DepositStatus.PENDING) {
      throw new BadRequestException('Deposit wurde bereits bearbeitet');
    }

    // Wenn der Deposit mit einer Wochenabgabe verknüpft ist, muss diese zurückgesetzt werden
    if (deposit.weeklyDeliveryId && deposit.weeklyDelivery) {
      const weeklyDelivery = deposit.weeklyDelivery;
      
      // Berechne neue Status basierend auf verbleibenden Paketen
      let newStatus: WeeklyDeliveryStatus = WeeklyDeliveryStatus.PENDING;
      let newPaidAmount = 0;
      
      // Finde alle anderen bestätigten Deposits für diese Wochenabgabe
      const otherConfirmedDeposits = await this.prisma.packageDeposit.findMany({
        where: {
          weeklyDeliveryId: deposit.weeklyDeliveryId,
          status: DepositStatus.CONFIRMED,
          id: { not: depositId }, // Ausschließen des aktuell abgelehnten Deposits
        },
      });
      
      // Berechne Gesamtmenge aus anderen bestätigten Deposits
      const totalConfirmedPackages = otherConfirmedDeposits.reduce(
        (sum, d) => sum + (d.weeklyDeliveryPackages || 0), 
        0
      );
      
      newPaidAmount = totalConfirmedPackages;
      
      if (newPaidAmount >= weeklyDelivery.packages) {
        newStatus = WeeklyDeliveryStatus.PAID;
      } else if (newPaidAmount > 0) {
        newStatus = WeeklyDeliveryStatus.PARTIALLY_PAID;
      }
      
      // Aktualisiere Wochenabgabe
      await this.prisma.weeklyDelivery.update({
        where: { id: deposit.weeklyDeliveryId },
        data: {
          status: newStatus,
          paidAmount: newPaidAmount,
        },
      });
    }

    const rejectedDeposit = await this.prisma.packageDeposit.update({
      where: { id: depositId },
      data: {
        status: DepositStatus.REJECTED,
        confirmedById: rejectedById,
        confirmedAt: new Date(),
        note: reason ? `${deposit.note || ''} (Abgelehnt: ${reason})`.trim() : deposit.note,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        confirmedBy: {
          select: {
            id: true,
            username: true,
          },
        },
        weeklyDelivery: {
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
        },
      },
    });

    await this.auditService.log({
      userId: rejectedById,
      action: 'PACKAGE_DEPOSIT_REJECTED',
      entity: 'PackageDeposit',
      entityId: depositId,
      meta: {
        packages: deposit.packages,
        reason,
        weeklyDeliveryId: deposit.weeklyDeliveryId,
        weeklyDeliveryPackages: deposit.weeklyDeliveryPackages,
      },
    });

    return rejectedDeposit;
  }

  async getCurrentDepositSummary() {
    const confirmedDeposits = await this.prisma.packageDeposit.findMany({
      where: {
        status: DepositStatus.CONFIRMED,
        uebergabeId: null, // Nur aktuelle Deposits (nicht archivierte)
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    const totalPackages = confirmedDeposits.reduce((sum, deposit) => sum + deposit.packages, 0);
    const totalWeeklyDeliveryPackages = confirmedDeposits.reduce((sum, deposit) => sum + (deposit.weeklyDeliveryPackages || 0), 0);
    const totalPayoutPackages = confirmedDeposits.reduce((sum, deposit) => sum + (deposit.payoutPackages || 0), 0);
    
    const userCounts = confirmedDeposits.reduce((acc, deposit) => {
      const userId = deposit.userId;
      if (!acc[userId]) {
        acc[userId] = {
          user: deposit.user,
          packages: 0,
          weeklyDeliveryPackages: 0,
          payoutPackages: 0,
        };
      }
      acc[userId].packages += deposit.packages;
      acc[userId].weeklyDeliveryPackages += (deposit.weeklyDeliveryPackages || 0);
      acc[userId].payoutPackages += (deposit.payoutPackages || 0);
      return acc;
    }, {} as Record<string, { user: any; packages: number; weeklyDeliveryPackages: number; payoutPackages: number }>);

    // Paket-Preis aus Settings holen
    const packagePrice = await this.getPackagePrice();

    return {
      totalPackages,
      totalWeeklyDeliveryPackages,
      totalPayoutPackages,
      totalUsers: Object.keys(userCounts).length,
      userDeposits: Object.values(userCounts).map(item => ({
        ...item,
        value: item.packages * packagePrice,
      })),
      totalValue: totalPackages * packagePrice,
      packagePrice,
    };
  }

  async getPackagePrice(): Promise<number> {
    const setting = await this.prisma.settings.findUnique({
      where: { key: 'package_price_per_unit' },
    });

    return setting ? (setting.value as number) : 1000; // Default: 1000 Schwarzgeld pro Paket
  }

  async setPackagePrice(price: number, updatedById: string) {
    if (price <= 0) {
      throw new BadRequestException('Preis muss größer als 0 sein');
    }

    const setting = await this.prisma.settings.upsert({
      where: { key: 'package_price_per_unit' },
      update: { value: price },
      create: {
        key: 'package_price_per_unit',
        value: price,
      },
    });

    await this.auditService.log({
      userId: updatedById,
      action: 'PACKAGE_PRICE_UPDATED',
      entity: 'Settings',
      entityId: setting.id,
      meta: {
        newPrice: price,
      },
    });

    return setting;
  }

  async archiveCurrentDeposits(archivedById: string, archiveName?: string) {
    const confirmedDeposits = await this.prisma.packageDeposit.findMany({
      where: {
        status: DepositStatus.CONFIRMED,
        uebergabeId: null, // Nur Deposits die noch nicht archiviert sind
      },
    });

    if (confirmedDeposits.length === 0) {
      throw new BadRequestException('Keine bestätigten Deposits zum Archivieren gefunden');
    }

    const totalPackages = confirmedDeposits.reduce((sum, deposit) => sum + deposit.packages, 0);
    const totalValue = totalPackages * (await this.getPackagePrice());

    const archive = await this.prisma.packageHandover.create({
      data: {
        name: archiveName || `Übergabe ${new Date().toLocaleDateString('de-DE')}`,
        totalPackages,
        totalValue,
        isActive: false, // Archivierte Übergaben sind nicht aktiv
        archivedAt: new Date(),
      },
    });

    // Alle bestätigten Deposits mit der Archiv-ID verknüpfen
    await this.prisma.packageDeposit.updateMany({
      where: {
        status: DepositStatus.CONFIRMED,
        uebergabeId: null,
      },
      data: {
        uebergabeId: archive.id,
      },
    });

    await this.auditService.log({
      userId: archivedById,
      action: 'PACKAGE_DEPOSITS_ARCHIVED',
      entity: 'PackageHandover',
      entityId: archive.id,
      meta: {
        totalPackages,
        totalValue,
        depositCount: confirmedDeposits.length,
      },
    });

    return archive;
  }

  async getRecentDeposits() {
    return this.prisma.packageDeposit.findMany({
      take: 50, // Letzte 50 Deposits
      where: {
        status: {
          in: [DepositStatus.CONFIRMED, DepositStatus.PENDING, DepositStatus.REJECTED], // Alle Status
        },
        uebergabeId: null, // Nur Deposits der aktuellen Übergabe (nicht archiviert)
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
        confirmedBy: {
          select: {
            id: true,
            username: true,
            icFirstName: true,
            icLastName: true,
          },
        },
        rejectedBy: {
          select: {
            id: true,
            username: true,
            icFirstName: true,
            icLastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getArchivedHandovers() {
    return this.prisma.packageHandover.findMany({
      where: {
        isActive: false,
      },
      orderBy: {
        archivedAt: 'desc',
      },
    });
  }

  async getArchiveDetails(archiveId: string) {
    const archive = await this.prisma.packageHandover.findUnique({
      where: { id: archiveId },
      include: {
        deposits: {
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
            confirmedBy: {
              select: {
                id: true,
                username: true,
                icFirstName: true,
                icLastName: true,
              },
            },
          },
        },
      },
    });

    if (!archive) {
      throw new BadRequestException('Archiv nicht gefunden');
    }

    // Calculate user summaries with weekly delivery separation
    const userSummary = archive.deposits.reduce((acc: any, deposit: any) => {
      const userId = deposit.userId;
      if (!acc[userId]) {
        acc[userId] = {
          user: deposit.user,
          totalPackages: 0,
          totalWeeklyDeliveryPackages: 0,
          totalPayoutPackages: 0,
          totalValue: 0,
          deposits: [],
        };
      }
      acc[userId].totalPackages += deposit.packages;
      acc[userId].totalWeeklyDeliveryPackages += (deposit.weeklyDeliveryPackages || 0);
      acc[userId].totalPayoutPackages += (deposit.payoutPackages || 0);
      acc[userId].deposits.push(deposit);
      return acc;
    }, {});

    // Calculate totals
    const totalPackages = archive.deposits.reduce((sum, deposit) => sum + deposit.packages, 0);
    const totalWeeklyDeliveryPackages = archive.deposits.reduce((sum, deposit) => sum + (deposit.weeklyDeliveryPackages || 0), 0);
    const totalPayoutPackages = archive.deposits.reduce((sum, deposit) => sum + (deposit.payoutPackages || 0), 0);

    // Calculate total value per user
    const packagePrice = await this.getPackagePrice();
    Object.values(userSummary).forEach((userData: any) => {
      userData.totalValue = userData.totalPackages * packagePrice;
    });

    return {
      ...archive,
      totalPackages,
      totalWeeklyDeliveryPackages,
      totalPayoutPackages,
      userSummary: Object.values(userSummary),
      packagePrice,
    };
  }

  async removePendingDeposit(depositId: string, removedById: string, reason: string) {
    const deposit = await this.prisma.packageDeposit.findUnique({
      where: { id: depositId },
      include: { 
        user: true,
        uebergabe: true,
        weeklyDelivery: true,
      },
    });

    if (!deposit) {
      throw new BadRequestException('Deposit nicht gefunden');
    }

    if (deposit.status === DepositStatus.REJECTED) {
      throw new BadRequestException('Abgelehnte Deposits können nicht entfernt werden');
    }

    // Prüfe ob Deposit zu einer archivierten Übergabe gehört
    if (deposit.uebergabe && !deposit.uebergabe.isActive) {
      throw new BadRequestException('Deposits aus archivierten Übergaben können nicht entfernt werden');
    }

    // Wenn der Deposit mit einer Wochenabgabe verknüpft ist, muss diese zurückgesetzt werden
    if (deposit.weeklyDeliveryId && deposit.weeklyDelivery) {
      const weeklyDelivery = deposit.weeklyDelivery;
      
      // Berechne neuen Status basierend auf verbleibenden bestätigten Deposits
      const remainingConfirmedDeposits = await this.prisma.packageDeposit.findMany({
        where: {
          weeklyDeliveryId: deposit.weeklyDeliveryId,
          status: DepositStatus.CONFIRMED,
          id: { not: depositId }, // Ausschließen des aktuell gelöschten Deposits
        },
      });
      
      const totalRemainingPackages = remainingConfirmedDeposits.reduce(
        (sum, d) => sum + (d.weeklyDeliveryPackages || 0), 
        0
      );
      
      let newStatus: WeeklyDeliveryStatus = WeeklyDeliveryStatus.PENDING;
      if (totalRemainingPackages >= weeklyDelivery.packages) {
        newStatus = WeeklyDeliveryStatus.PAID;
      } else if (totalRemainingPackages > 0) {
        newStatus = WeeklyDeliveryStatus.PARTIALLY_PAID;
      }
      
      // Aktualisiere Wochenabgabe
      await this.prisma.weeklyDelivery.update({
        where: { id: deposit.weeklyDeliveryId },
        data: {
          status: newStatus,
          paidAmount: totalRemainingPackages,
        },
      });
    }

    // Deposit löschen
    await this.prisma.packageDeposit.delete({
      where: { id: depositId },
    });

    await this.auditService.log({
      userId: removedById,
      action: 'PACKAGE_DEPOSIT_REMOVED',
      entity: 'PackageDeposit',
      entityId: depositId,
      meta: {
        packages: deposit.packages,
        depositUser: deposit.user.username,
        reason,
        depositNote: deposit.note,
        originalStatus: deposit.status,
        weeklyDeliveryId: deposit.weeklyDeliveryId,
        weeklyDeliveryPackages: deposit.weeklyDeliveryPackages,
      },
    });

    return { success: true, message: 'Deposit wurde entfernt' };
  }

  canConfirmDeposit(userRole: Role): boolean {
    return userRole === Role.EL_PATRON || 
           userRole === Role.DON || 
           userRole === Role.ROUTENVERWALTUNG ||
           userRole === Role.LOGISTICA;
  }
}
