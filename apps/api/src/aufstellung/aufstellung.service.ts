import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AufstellungResponseStatus, Role } from '@prisma/client';
import { SanctionsService } from '../sanctions/sanctions.service';
import { AbmeldungService } from '../abmeldung/abmeldung.service';
import { DiscordService } from '../discord/discord.service';
import { ExclusionService } from '../common/exclusion/exclusion.service';

// Discord Kanal ID für Aufstellungs-Reminder
const AUFSTELLUNG_REMINDER_CHANNEL_ID = '1495540055601578135';

@Injectable()
export class AufstellungService {
  constructor(
    private prisma: PrismaService,
    private sanctionsService: SanctionsService,
    @Inject(forwardRef(() => AbmeldungService))
    private abmeldungService: AbmeldungService,
    private discordService: DiscordService,
    private exclusionService: ExclusionService,
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
    // Hole alle aktiven User (keine Partner/Taxi/Ausgeschlossene - nur interne Mitglieder)
    const allUsersRaw = await this.prisma.user.findMany({
      where: {
        isPartner: false,
        isTaxi: false,
      },
      select: {
        id: true,
        discordRoles: true,
      },
    });

    // Filter ausgeschlossene User (Discord-Rolle)
    const allUsers = allUsersRaw.filter(u => !this.exclusionService.hasExcludedRole(u.discordRoles));

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
    const aufstellungen = await this.prisma.aufstellung.findMany({
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
                isTaxi: true,
                isPartner: true,
              },
            },
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    // Filtere Responses: Nur interne User (keine Taxi/Partner)
    return aufstellungen.map(aufstellung => ({
      ...aufstellung,
      responses: aufstellung.responses.filter(r => !r.user.isTaxi && !r.user.isPartner),
    }));
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

    // Alle aktiven User abrufen um zu sehen wer nicht reagiert hat (keine Partner/Taxi/Ausgeschlossene - nur interne Mitglieder)
    const allUsersRaw = await this.prisma.user.findMany({
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
        discordRoles: true,
      },
    });

    // Filter ausgeschlossene User (Discord-Rolle)
    const allUsers = allUsersRaw.filter(u => !this.exclusionService.hasExcludedRole(u.discordRoles));

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

    // Filtere Responses: Nur interne User (keine Taxi/Partner)
    const internalUserIds = new Set(allUsers.map(u => u.id));
    const filteredResponses = aufstellung.responses.filter(r => internalUserIds.has(r.userId));

    // Total sollte nur nicht-ausgeschlossene User zählen
    const totalNonExcluded = allUsers.length - excludedUserIds.size;

    return {
      ...aufstellung,
      responses: filteredResponses, // Nur interne User in Responses
      stats: {
        total: totalNonExcluded,
        coming: filteredResponses.filter(r => r.status === AufstellungResponseStatus.COMING).length,
        comingLate: filteredResponses.filter(r => r.status === AufstellungResponseStatus.COMING_LATE).length,
        notComing: filteredResponses.filter(r => r.status === AufstellungResponseStatus.NOT_COMING).length,
        unsure: filteredResponses.filter(r => r.status === AufstellungResponseStatus.UNSURE).length,
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
        responses: {
          include: {
            user: {
              select: {
                id: true,
                isTaxi: true,
                isPartner: true,
              },
            },
          },
        },
      },
    });

    if (!aufstellung) {
      throw new NotFoundException('Aufstellung nicht gefunden');
    }

    // Nur sanktionieren wenn Deadline erreicht ist
    if (new Date() < aufstellung.deadline) {
      throw new BadRequestException('Die Deadline wurde noch nicht erreicht');
    }

    // Alle aktiven User abrufen (keine Partner/Taxi/Ausgeschlossene - nur interne Mitglieder)
    const allUsersRaw = await this.prisma.user.findMany({
      where: {
        isPartner: false,
        isTaxi: false,
      },
      select: {
        id: true,
        username: true,
        icFirstName: true,
        icLastName: true,
        discordRoles: true,
      },
    });

    // Filter ausgeschlossene User (Discord-Rolle)
    const allUsers = allUsersRaw.filter(u => !this.exclusionService.hasExcludedRole(u.discordRoles));

    // Filtere Responses: Nur interne User (keine Taxi/Partner/Ausgeschlossene)
    const internalUserIds = new Set(allUsers.map(u => u.id));
    const filteredResponses = aufstellung.responses.filter(r => internalUserIds.has(r.userId));
    const respondedUserIds = new Set(filteredResponses.map(r => r.userId));
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
    const aufstellungen = await this.prisma.aufstellung.findMany({
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
                isTaxi: true,
                isPartner: true,
              },
            },
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Filtere Responses: Nur interne User (keine Taxi/Partner)
    return aufstellungen.map(aufstellung => ({
      ...aufstellung,
      responses: aufstellung.responses.filter(r => !r.user.isTaxi && !r.user.isPartner),
    }));
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

  // Reminder an Discord-Kanal senden
  async sendReminder(aufstellungId: string) {
    const aufstellung = await this.prisma.aufstellung.findUnique({
      where: { id: aufstellungId },
      include: {
        responses: {
          include: {
            user: {
              select: {
                id: true,
                isTaxi: true,
                isPartner: true,
              },
            },
          },
        },
      },
    });

    if (!aufstellung) {
      throw new NotFoundException('Aufstellung nicht gefunden');
    }

    // Alle aktiven User abrufen (keine Partner/Taxi/Ausgeschlossene - nur interne Mitglieder)
    const allUsersRaw = await this.prisma.user.findMany({
      where: {
        isPartner: false,
        isTaxi: false,
      },
      select: {
        id: true,
        username: true,
        icFirstName: true,
        icLastName: true,
        discordId: true,
        discordRoles: true,
      },
    });

    // Filter ausgeschlossene User (Discord-Rolle)
    const allUsers = allUsersRaw.filter(u => !this.exclusionService.hasExcludedRole(u.discordRoles));

    // Filtere Responses: Nur interne User (keine Taxi/Partner)
    const internalUserIds = new Set(allUsers.map(u => u.id));
    const filteredResponses = aufstellung.responses.filter(r => internalUserIds.has(r.userId));
    const respondedUserIds = new Set(filteredResponses.map(r => r.userId));
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

    if (usersWithoutResponse.length === 0) {
      return {
        message: 'Alle Mitglieder haben bereits reagiert, kein Reminder nötig.',
        mentionedCount: 0,
      };
    }

    // Discord-IDs sammeln für Mentions
    const discordMentions = usersWithoutResponse
      .filter(u => u.discordId)
      .map(u => `<@${u.discordId}>`)
      .join(' ');

    // Datum formatieren
    const dateStr = aufstellung.date.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const timeStr = aufstellung.date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Berlin',
    });

    // Kartell-Stil Reminder Messages
    const reminderTitles = [
      '🔫 La Familia ruft!',
      '⚠️ Mensaje de los Jefes',
      '🌵 Es gibt Arbeit, Hermanos!',
      '💀 Los Muertos warten nicht...',
      '🔥 El Cartel braucht Antworten!',
    ];

    const reminderMessages = [
      'La Familia hat euch gerufen und erwartet eine Antwort. Wer schweigt, zeigt Respektlosigkeit.',
      'Die Bosse haben gesprochen - jetzt seid ihr dran. Keine Antwort ist keine Option, compañeros.',
      'In diesem Geschäft zählt Loyalität. Zeigt sie, indem ihr antwortet.',
      'El Cartel verlangt eure Präsenz. Meldet euch - oder erklärt euch vor den Jefes.',
      'Die Familia vergisst nicht. Reagiert, bevor es die Bosse für euch tun müssen.',
    ];

    const randomIndex = Math.floor(Math.random() * reminderTitles.length);

    // Embed-Nachricht erstellen im Kartell-Stil
    const embed = {
      title: reminderTitles[randomIndex],
      description: reminderMessages[randomIndex],
      color: 0xDC2626, // Rot/Blut-Farbe
      fields: [
        {
          name: '📅 Aufstellung',
          value: aufstellung.reason,
          inline: false,
        },
        {
          name: '🗓️ Datum & Zeit',
          value: `${dateStr} um ${timeStr} Uhr`,
          inline: true,
        },
        {
          name: '👥 Ausstehend',
          value: `${usersWithoutResponse.length} Mitglieder`,
          inline: true,
        },
      ],
      footer: {
        text: '🌵 La Santa Cartel - Sistema de Aufstellungen',
      },
      timestamp: new Date().toISOString(),
    };

    try {
      // Erst das Embed senden
      await this.discordService.sendChannelEmbed(AUFSTELLUNG_REMINDER_CHANNEL_ID, embed);

      // Dann die Mentions separat (damit sie gepingt werden)
      if (discordMentions) {
        await this.discordService.sendChannelMessage(
          AUFSTELLUNG_REMINDER_CHANNEL_ID,
          `🚨 **ACHTUNG PENDIENTE:** ${discordMentions}\n\n*Reagiert jetzt auf die Aufstellung - los Jefes beobachten!*`
        );
      }

      return {
        message: `Reminder gesendet! ${usersWithoutResponse.length} Mitglieder wurden erwähnt.`,
        mentionedCount: usersWithoutResponse.length,
        mentionedUsers: usersWithoutResponse.map(u => ({
          name: u.icFirstName && u.icLastName 
            ? `${u.icFirstName} ${u.icLastName}` 
            : u.username,
        })),
      };
    } catch (error) {
      console.error('Fehler beim Senden des Reminders:', error);
      throw new BadRequestException('Fehler beim Senden des Discord-Reminders');
    }
  }
}

