import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AufstellungResponseStatus, Role } from '@prisma/client';
import { SanctionsService } from '../sanctions/sanctions.service';

@Injectable()
export class AufstellungService {
  constructor(
    private prisma: PrismaService,
    private sanctionsService: SanctionsService,
  ) {}

  // Erstelle neue Aufstellung
  async createAufstellung(
    createdById: string,
    date: Date,
    reason: string,
  ) {
    // Datum darf nicht in der Vergangenheit liegen
    if (date < new Date()) {
      throw new BadRequestException('Datum darf nicht in der Vergangenheit liegen');
    }

    const aufstellung = await this.prisma.aufstellung.create({
      data: {
        createdById,
        date,
        reason,
        deadline: date, // Deadline ist das Aufstellungsdatum
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            icFirstName: true,
            icLastName: true,
          },
        },
      },
    });

    return aufstellung;
  }

  // Alle Aufstellungen abrufen
  async getAllAufstellungen() {
    return this.prisma.aufstellung.findMany({
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            icFirstName: true,
            icLastName: true,
          },
        },
        responses: {
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
      orderBy: {
        date: 'desc',
      },
    });
  }

  // Einzelne Aufstellung mit Details abrufen
  async getAufstellungById(id: string) {
    const aufstellung = await this.prisma.aufstellung.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            icFirstName: true,
            icLastName: true,
          },
        },
        responses: {
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
        },
      },
    });

    if (!aufstellung) {
      throw new NotFoundException('Aufstellung nicht gefunden');
    }

    // Alle User abrufen um zu sehen wer nicht reagiert hat
    const allUsers = await this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        icFirstName: true,
        icLastName: true,
        role: true,
      },
    });

    const respondedUserIds = new Set(aufstellung.responses.map(r => r.userId));
    const usersWithoutResponse = allUsers.filter(user => !respondedUserIds.has(user.id));

    return {
      ...aufstellung,
      stats: {
        total: allUsers.length,
        coming: aufstellung.responses.filter(r => r.status === AufstellungResponseStatus.COMING).length,
        notComing: aufstellung.responses.filter(r => r.status === AufstellungResponseStatus.NOT_COMING).length,
        unsure: aufstellung.responses.filter(r => r.status === AufstellungResponseStatus.UNSURE).length,
        noResponse: usersWithoutResponse.length,
      },
      usersWithoutResponse,
    };
  }

  // User reagiert auf Aufstellung
  async respondToAufstellung(
    aufstellungId: string,
    userId: string,
    status: AufstellungResponseStatus,
  ) {
    const aufstellung = await this.prisma.aufstellung.findUnique({
      where: { id: aufstellungId },
    });

    if (!aufstellung) {
      throw new NotFoundException('Aufstellung nicht gefunden');
    }

    // Prüfen ob Deadline bereits abgelaufen
    if (new Date() > aufstellung.deadline) {
      throw new BadRequestException('Die Deadline für diese Aufstellung ist bereits abgelaufen');
    }

    // Upsert Response (erstellen oder aktualisieren)
    const response = await this.prisma.aufstellungResponse.upsert({
      where: {
        aufstellungId_userId: {
          aufstellungId,
          userId,
        },
      },
      update: {
        status,
      },
      create: {
        aufstellungId,
        userId,
        status,
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

    return response;
  }

  // Sanktioniere User die nicht reagiert haben
  async sanctionNonResponders(aufstellungId: string) {
    const aufstellung = await this.prisma.aufstellung.findUnique({
      where: { id: aufstellungId },
      include: {
        responses: true,
      },
    });

    if (!aufstellung) {
      throw new NotFoundException('Aufstellung nicht gefunden');
    }

    // Nur sanktionieren wenn Deadline erreicht ist
    if (new Date() < aufstellung.deadline) {
      throw new BadRequestException('Die Deadline wurde noch nicht erreicht');
    }

    // Alle User abrufen
    const allUsers = await this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        icFirstName: true,
        icLastName: true,
      },
    });

    const respondedUserIds = new Set(aufstellung.responses.map(r => r.userId));
    const usersWithoutResponse = allUsers.filter(user => !respondedUserIds.has(user.id));

    const sanctions = [];

    for (const user of usersWithoutResponse) {
      try {
        const sanction = await this.sanctionsService.createSanction(
          user.id,
          'REAKTIONSPFLICHT',
          `Keine Reaktion auf Aufstellung vom ${aufstellung.date.toLocaleDateString('de-DE')} - ${aufstellung.reason}`,
          'system',
        );
        sanctions.push(sanction);
      } catch (error) {
        console.error(`Fehler beim Sanktionieren von User ${user.username}:`, error);
      }
    }

    return {
      message: `${sanctions.length} User wurden sanktioniert`,
      sanctionedUsers: sanctions.length,
      sanctions,
    };
  }

  // Aufstellung löschen
  async deleteAufstellung(id: string) {
    const aufstellung = await this.prisma.aufstellung.findUnique({
      where: { id },
    });

    if (!aufstellung) {
      throw new NotFoundException('Aufstellung nicht gefunden');
    }

    await this.prisma.aufstellung.delete({
      where: { id },
    });

    return { message: 'Aufstellung wurde gelöscht' };
  }

  // Aktuelle/Kommende Aufstellungen
  async getUpcomingAufstellungen() {
    return this.prisma.aufstellung.findMany({
      where: {
        date: {
          gte: new Date(),
        },
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            icFirstName: true,
            icLastName: true,
          },
        },
        responses: {
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
      orderBy: {
        date: 'asc',
      },
    });
  }

  // Meine Aufstellungen (wo ich noch nicht reagiert habe)
  async getMyPendingAufstellungen(userId: string) {
    const allUpcoming = await this.prisma.aufstellung.findMany({
      where: {
        date: {
          gte: new Date(),
        },
      },
      include: {
        responses: {
          where: {
            userId,
          },
        },
        createdBy: {
          select: {
            id: true,
            username: true,
            icFirstName: true,
            icLastName: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Filtere nur die, wo User noch nicht reagiert hat
    return allUpcoming.filter(auf => auf.responses.length === 0);
  }
}

