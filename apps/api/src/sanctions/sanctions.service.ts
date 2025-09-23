import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Sanction, SanctionCategory, SanctionStatus } from '@prisma/client';

@Injectable()
export class SanctionsService {
  constructor(private prisma: PrismaService) {}

  // Sanktion erstellen
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

    return this.prisma.sanction.create({
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

    return this.prisma.sanction.update({
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
          case 1: return { penalty: 'LaSanta Calavera Brücke 1x' };
          case 2: return { penalty: 'LaSanta Calavera Brücke 2x' };
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
    }

    return {};
  }
}
