import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AufstellungResponseStatus, Role } from '@prisma/client';
import { SanctionsService } from '../sanctions/sanctions.service';
import { AbmeldungService } from '../abmeldung/abmeldung.service';

@Injectable()
export class AufstellungService {
  constructor(
    private prisma: PrismaService,
    private sanctionsService: SanctionsService,
    @Inject(forwardRef(() => AbmeldungService))
    private abmeldungService: AbmeldungService,
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

    // Automatisch abgemeldete User auf "Kommt nicht" setzen
    await this.autoSetAbgemeldetUserNotComing(aufstellung.id, date);

    return aufstellung;
  }

  // Automatisch abgemeldete User auf "Kommt nicht" setzen
  private async autoSetAbgemeldetUserNotComing(aufstellungId: string, aufstellungDate: Date) {
    // Hole alle User (keine Partner/Taxi - nur interne Mitglieder)
    const allUsers = await this.prisma.user.findMany({
      where: {
        isPartner: false,
        isTaxi: false,
      },
      select: {
        id: true,
      },
    });

    // Prüfe für jeden User, ob er abgemeldet ist
    for (const user of allUsers) {
      const isAbgemeldet = await this.abmeldungService.isUserAbgemeldet(user.id, aufstellungDate);
      
      if (isAbgemeldet) {
        // Setze Response automatisch auf NOT_COMING
        await this.prisma.aufstellungResponse.upsert({
          where: {
            aufstellungId_userId: {
              aufstellungId,
              userId: user.id,
            },
          },
          update: {
            status: AufstellungResponseStatus.NOT_COMING,
          },
          create: {
            aufstellungId,
            userId: user.id,
            status: AufstellungResponseStatus.NOT_COMING,
          },
        });
      }
    }
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

    // Alle User abrufen um zu sehen wer nicht reagiert hat (keine Partner/Taxi - nur interne Mitglieder)
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
        role: true,
      },
    });

    const respondedUserIds = new Set(aufstellung.responses.map(r => r.userId));
    let usersWithoutResponse = allUsers.filter(user => !respondedUserIds.has(user.id));

    // Ausgeschlossene User filtern (die aktive Exclusions haben)
    const exclusions = await this.prisma.aufstellungExclusion.findMany({
      where: {
        isActive: true,
        startDate: { lte: aufstellung.date },
        OR: [
          { endDate: null },
          { endDate: { gte: aufstellung.date } },
        ],
      },
      select: {
        userId: true,
      },
    });

    const excludedUserIds = new Set(exclusions.map(e => e.userId));
    usersWithoutResponse = usersWithoutResponse.filter(user => !excludedUserIds.has(user.id));

    // Total sollte nur nicht-ausgeschlossene User zählen
    const totalNonExcluded = allUsers.length - excludedUserIds.size;

    return {
      ...aufstellung,
      stats: {
        total: totalNonExcluded,
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

    // Alle User abrufen (keine Partner/Taxi - nur interne Mitglieder)
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
      },
    });

    const respondedUserIds = new Set(aufstellung.responses.map(r => r.userId));
    let usersWithoutResponse = allUsers.filter(user => !respondedUserIds.has(user.id));

    // Ausgeschlossene User filtern (die aktive Exclusions haben)
    const exclusions = await this.prisma.aufstellungExclusion.findMany({
      where: {
        isActive: true,
        startDate: { lte: aufstellung.date },
        OR: [
          { endDate: null },
          { endDate: { gte: aufstellung.date } },
        ],
      },
      select: {
        userId: true,
      },
    });

    const excludedUserIds = new Set(exclusions.map(e => e.userId));
    usersWithoutResponse = usersWithoutResponse.filter(user => !excludedUserIds.has(user.id));

    const sanctions = [];
    const skippedUsers = [];

    for (const user of usersWithoutResponse) {
      try {
        // Prüfe ob User bereits eine Sanktion für diese spezifische Aufstellung hat
        const existingSanction = await this.prisma.sanction.findFirst({
          where: {
            userId: user.id,
            category: 'REAKTIONSPFLICHT',
            description: {
              contains: aufstellung.date.toLocaleDateString('de-DE'),
            },
          },
        });

        if (existingSanction) {
          skippedUsers.push({ user, reason: 'Bereits sanktioniert' });
          continue;
        }

        const sanction = await this.sanctionsService.createSanctionWithAutoLevel(
          user.id,
          'REAKTIONSPFLICHT',
          `Keine Reaktion auf Aufstellung vom ${aufstellung.date.toLocaleDateString('de-DE')} - ${aufstellung.reason}`,
          aufstellung.createdById,
        );
        sanctions.push(sanction);
      } catch (error) {
        console.error(`Fehler beim Sanktionieren von User ${user.username}:`, error);
        skippedUsers.push({ user, reason: error.message });
      }
    }

    return {
      message: `${sanctions.length} User wurden sanktioniert, ${skippedUsers.length} übersprungen, ${excludedUserIds.size} ausgeschlossen`,
      sanctionedUsers: sanctions.length,
      skippedUsers: skippedUsers.length,
      excludedUsers: excludedUserIds.size,
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

  // Exclusion erstellen
  async createExclusion(
    userId: string,
    reason: string,
    startDate: Date,
    endDate: Date | null,
    createdById: string,
  ) {
    const exclusion = await this.prisma.aufstellungExclusion.create({
      data: {
        userId,
        reason,
        startDate,
        endDate,
        createdById,
        isActive: true,
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

    return exclusion;
  }

  // Alle Exclusions abrufen
  async getAllExclusions() {
    return this.prisma.aufstellungExclusion.findMany({
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

  // Aktive Exclusions abrufen
  async getActiveExclusions() {
    return this.prisma.aufstellungExclusion.findMany({
      where: {
        isActive: true,
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
        startDate: 'desc',
      },
    });
  }

  // Exclusion deaktivieren
  async deactivateExclusion(id: string) {
    const exclusion = await this.prisma.aufstellungExclusion.findUnique({
      where: { id },
    });

    if (!exclusion) {
      throw new NotFoundException('Exclusion nicht gefunden');
    }

    return this.prisma.aufstellungExclusion.update({
      where: { id },
      data: {
        isActive: false,
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

  // Exclusion löschen
  async deleteExclusion(id: string) {
    const exclusion = await this.prisma.aufstellungExclusion.findUnique({
      where: { id },
    });

    if (!exclusion) {
      throw new NotFoundException('Exclusion nicht gefunden');
    }

    await this.prisma.aufstellungExclusion.delete({
      where: { id },
    });

    return { message: 'Exclusion wurde gelöscht' };
  }
}

