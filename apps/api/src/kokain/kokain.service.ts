import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Role, DepositStatus } from '@prisma/client';
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
      include: { user: true },
    });

    if (!deposit) {
      throw new BadRequestException('Deposit nicht gefunden');
    }

    if (deposit.status !== DepositStatus.PENDING) {
      throw new BadRequestException('Deposit wurde bereits bearbeitet');
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
      },
    });

    return confirmedDeposit;
  }

  async rejectDeposit(depositId: string, rejectedById: string, reason?: string) {
    const deposit = await this.prisma.kokainDeposit.findUnique({
      where: { id: depositId },
    });

    if (!deposit) {
      throw new BadRequestException('Deposit nicht gefunden');
    }

    if (deposit.status !== DepositStatus.PENDING) {
      throw new BadRequestException('Deposit wurde bereits bearbeitet');
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
    const userCounts = confirmedDeposits.reduce((acc, deposit) => {
      const userId = deposit.userId;
      if (!acc[userId]) {
        acc[userId] = {
          user: deposit.user,
          packages: 0,
        };
      }
      acc[userId].packages += deposit.packages;
      return acc;
    }, {} as Record<string, { user: any; packages: number }>);

    // Kokain-Preis aus Settings holen
    const kokainPrice = await this.getKokainPrice();

    return {
      totalPackages,
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
      include: { user: true },
    });

    if (!deposit) {
      throw new BadRequestException('Deposit nicht gefunden');
    }

    if (deposit.status === DepositStatus.REJECTED) {
      throw new BadRequestException('Abgelehnte Deposits können nicht entfernt werden');
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
      },
    });

    return { success: true, message: 'Deposit wurde entfernt' };
  }

  canConfirmDeposit(userRole: Role): boolean {
    return userRole === Role.EL_PATRON || 
           userRole === Role.DON || 
           userRole === Role.ASESOR;
  }
}
