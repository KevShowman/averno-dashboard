import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Role, DepositStatus, WeeklyDeliveryStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class KokainService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async createDeposit(userId: string, packages: number, note?: string) {
    if (packages <= 0) {
      throw new BadRequestException('Anzahl der Pakete muss größer als 0 sein');
    }

    const deposit = await this.prisma.kokainDeposit.create({
      data: {
        userId,
        packages,
        note,
        status: DepositStatus.PENDING,
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
      action: 'KOKAIN_DEPOSIT_CREATED',
      entity: 'KokainDeposit',
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
        status: WeeklyDeliveryStatus.PENDING,
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

    return pendingDelivery;
  }

  // Kokain-Deposit mit Wochenabgabe-Integration erstellen
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

      // Berechne noch benötigte Pakete für Wochenabgabe
      const alreadyPaid = weeklyDelivery.paidAmount || 0;
      const remainingRequired = Math.max(0, 300 - alreadyPaid);
      
      // Verwende nur die benötigten Pakete für Wochenabgabe
      weeklyDeliveryPackages = Math.min(packages, remainingRequired);
      payoutPackages = packages - weeklyDeliveryPackages;

      // Wochenabgabe Status basierend auf Gesamtpaketen setzen
      let newStatus: WeeklyDeliveryStatus = WeeklyDeliveryStatus.PENDING;
      const totalPaid = alreadyPaid + weeklyDeliveryPackages;
      if (totalPaid >= 300) {
        newStatus = WeeklyDeliveryStatus.PAID;
      } else if (totalPaid > 0) {
        newStatus = WeeklyDeliveryStatus.PARTIALLY_PAID;
      }

      // Wochenabgabe aktualisieren (aber noch nicht als bezahlt markieren - das passiert erst bei Bestätigung)
      await this.prisma.weeklyDelivery.update({
        where: { id: weeklyDeliveryId },
        data: {
          status: newStatus,
          paidAmount: totalPaid,
        },
      });
    }

    const deposit = await this.prisma.kokainDeposit.create({
      data: {
        userId,
        packages,
        note,
        status: DepositStatus.PENDING,
        weeklyDeliveryId: useForWeeklyDelivery ? weeklyDeliveryId : null,
        weeklyDeliveryPackages: weeklyDeliveryPackages > 0 ? weeklyDeliveryPackages : null,
        payoutPackages: payoutPackages > 0 ? payoutPackages : null,
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
      action: 'KOKAIN_DEPOSIT_CREATED',
      entity: 'KokainDeposit',
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
    return this.prisma.kokainDeposit.findMany({
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
    return this.prisma.kokainDeposit.findMany({
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
    const deposit = await this.prisma.kokainDeposit.findUnique({
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
      const allConfirmedDeposits = await this.prisma.kokainDeposit.findMany({
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

    const confirmedDeposit = await this.prisma.kokainDeposit.update({
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
      action: 'KOKAIN_DEPOSIT_CONFIRMED',
      entity: 'KokainDeposit',
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
    const deposit = await this.prisma.kokainDeposit.findUnique({
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
      const otherConfirmedDeposits = await this.prisma.kokainDeposit.findMany({
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

    const rejectedDeposit = await this.prisma.kokainDeposit.update({
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
      action: 'KOKAIN_DEPOSIT_REJECTED',
      entity: 'KokainDeposit',
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
    const confirmedDeposits = await this.prisma.kokainDeposit.findMany({
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

    // Kokain-Preis aus Settings holen
    const kokainPrice = await this.getKokainPrice();

    return {
      totalPackages,
      totalWeeklyDeliveryPackages,
      totalPayoutPackages,
      totalUsers: Object.keys(userCounts).length,
      userDeposits: Object.values(userCounts).map(item => ({
        ...item,
        value: item.packages * kokainPrice,
      })),
      totalValue: totalPackages * kokainPrice,
      kokainPrice,
    };
  }

  async getKokainPrice(): Promise<number> {
    const setting = await this.prisma.settings.findUnique({
      where: { key: 'kokain_price_per_package' },
    });

    return setting ? (setting.value as number) : 1000; // Default: 1000 Schwarzgeld pro Paket
  }

  async setKokainPrice(price: number, updatedById: string) {
    if (price <= 0) {
      throw new BadRequestException('Preis muss größer als 0 sein');
    }

    const setting = await this.prisma.settings.upsert({
      where: { key: 'kokain_price_per_package' },
      update: { value: price },
      create: {
        key: 'kokain_price_per_package',
        value: price,
      },
    });

    await this.auditService.log({
      userId: updatedById,
      action: 'KOKAIN_PRICE_UPDATED',
      entity: 'Settings',
      entityId: setting.id,
      meta: {
        newPrice: price,
      },
    });

    return setting;
  }

  async archiveCurrentDeposits(archivedById: string, archiveName?: string) {
    const confirmedDeposits = await this.prisma.kokainDeposit.findMany({
      where: {
        status: DepositStatus.CONFIRMED,
        uebergabeId: null, // Nur Deposits die noch nicht archiviert sind
      },
    });

    if (confirmedDeposits.length === 0) {
      throw new BadRequestException('Keine bestätigten Deposits zum Archivieren gefunden');
    }

    const totalPackages = confirmedDeposits.reduce((sum, deposit) => sum + deposit.packages, 0);
    const totalValue = totalPackages * (await this.getKokainPrice());

    const archive = await this.prisma.kokainUebergabe.create({
      data: {
        name: archiveName || `Übergabe ${new Date().toLocaleDateString('de-DE')}`,
        totalPackages,
        totalValue,
        isActive: false, // Archivierte Übergaben sind nicht aktiv
        archivedAt: new Date(),
      },
    });

    // Alle bestätigten Deposits mit der Archiv-ID verknüpfen
    await this.prisma.kokainDeposit.updateMany({
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
      action: 'KOKAIN_DEPOSITS_ARCHIVED',
      entity: 'KokainUebergabe',
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
    return this.prisma.kokainDeposit.findMany({
      take: 50, // Letzte 50 Deposits
      where: {
        status: {
          in: [DepositStatus.CONFIRMED, DepositStatus.PENDING], // Nur bestätigte und angefragte
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
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getArchivedUebergaben() {
    return this.prisma.kokainUebergabe.findMany({
      where: {
        isActive: false,
      },
      orderBy: {
        archivedAt: 'desc',
      },
    });
  }

  async getArchiveDetails(archiveId: string) {
    const archive = await this.prisma.kokainUebergabe.findUnique({
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

    // Calculate user summaries
    const userSummary = archive.deposits.reduce((acc: any, deposit: any) => {
      const userId = deposit.userId;
      if (!acc[userId]) {
        acc[userId] = {
          user: deposit.user,
          totalPackages: 0,
          totalValue: 0,
          deposits: [],
        };
      }
      acc[userId].totalPackages += deposit.packages;
      acc[userId].deposits.push(deposit);
      return acc;
    }, {});

    // Calculate total value per user
    const kokainPrice = await this.getKokainPrice();
    Object.values(userSummary).forEach((userData: any) => {
      userData.totalValue = userData.totalPackages * kokainPrice;
    });

    return {
      ...archive,
      userSummary: Object.values(userSummary),
      kokainPrice,
    };
  }

  async removePendingDeposit(depositId: string, removedById: string, reason: string) {
    const deposit = await this.prisma.kokainDeposit.findUnique({
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
      
      // Berechne neue Status basierend auf verbleibenden bestätigten Deposits
      const remainingConfirmedDeposits = await this.prisma.kokainDeposit.findMany({
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
    await this.prisma.kokainDeposit.delete({
      where: { id: depositId },
    });

    await this.auditService.log({
      userId: removedById,
      action: 'KOKAIN_DEPOSIT_REMOVED',
      entity: 'KokainDeposit',
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
