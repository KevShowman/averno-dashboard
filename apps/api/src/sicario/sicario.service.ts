import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AufstellungResponseStatus, Role } from '@prisma/client';
import { DiscordService } from '../discord/discord.service';

@Injectable()
export class SicarioService {
  constructor(
    private prisma: PrismaService,
    private discordService: DiscordService,
  ) {}

  // Alle Sicarios holen (User mit SICARIO Rolle)
  private async getSicarioUsers() {
    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { role: Role.SICARIO },
          {
            allRoles: {
              path: '$',
              array_contains: 'SICARIO',
            },
          },
        ],
      },
      select: {
        id: true,
        discordId: true,
        username: true,
        icFirstName: true,
        icLastName: true,
        role: true,
        allRoles: true,
      },
    });

    // Zusätzlich filtern für JSON array (MySQL)
    return users.filter(user => {
      if (user.role === Role.SICARIO) return true;
      const allRoles = Array.isArray(user.allRoles) ? user.allRoles : [];
      return allRoles.includes('SICARIO');
    });
  }

  // Prüfen ob User Sicario ist
  async isSicario(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, allRoles: true },
    });

    if (!user) return false;
    if (user.role === Role.SICARIO) return true;
    
    const allRoles = Array.isArray(user.allRoles) ? user.allRoles : [];
    return allRoles.includes('SICARIO');
  }

  // Prüfen ob User Leaderschaft ist
  async isLeadership(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, allRoles: true },
    });

    if (!user) return false;
    
    const leadershipRoles = [Role.EL_PATRON, Role.DON_CAPITAN, Role.DON_COMANDANTE, Role.EL_MANO_DERECHA];
    if (leadershipRoles.includes(user.role as Role)) return true;
    
    const allRoles = Array.isArray(user.allRoles) ? user.allRoles : [];
    return leadershipRoles.some(r => allRoles.includes(r));
  }

  // Erstelle neue Sicario-Aufstellung
  async createAufstellung(
    createdById: string,
    date: Date,
    reason: string,
    location?: string,
  ) {
    // Datum darf nicht in der Vergangenheit liegen
    if (date < new Date()) {
      throw new BadRequestException('Datum darf nicht in der Vergangenheit liegen');
    }

    const aufstellung = await this.prisma.sicarioAufstellung.create({
      data: {
        createdById,
        date,
        reason,
        location,
        deadline: date,
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

    // Discord DM an alle Sicarios senden
    await this.notifySicarios(aufstellung);

    return aufstellung;
  }

  // Discord DM an alle Sicarios senden
  private async notifySicarios(aufstellung: any) {
    try {
      const sicarios = await this.getSicarioUsers();
      
      const creatorName = aufstellung.createdBy.icFirstName && aufstellung.createdBy.icLastName
        ? `${aufstellung.createdBy.icFirstName} ${aufstellung.createdBy.icLastName}`
        : aufstellung.createdBy.username;

      const dateStr = aufstellung.date.toLocaleDateString('de-DE', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const timeStr = aufstellung.date.toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
      });

      const embed = {
        title: '🔫 SICARIO EINSATZ',
        description: `Ein neuer Sicario-Einsatz wurde erstellt!`,
        color: 0x8B0000, // Dunkelrot
        fields: [
          {
            name: '📋 Einsatz',
            value: aufstellung.reason,
            inline: false,
          },
          {
            name: '📅 Datum & Zeit',
            value: `**${dateStr}** um **${timeStr} Uhr**`,
            inline: true,
          },
          ...(aufstellung.location ? [{
            name: '📍 Treffpunkt',
            value: aufstellung.location,
            inline: true,
          }] : []),
          {
            name: '👑 Erstellt von',
            value: creatorName,
            inline: false,
          },
        ],
        footer: {
          text: 'Sicario Division - La Santa Calavera',
        },
        timestamp: new Date().toISOString(),
      };

      let notifiedCount = 0;
      for (const sicario of sicarios) {
        if (sicario.discordId) {
          const sent = await this.discordService.sendEmbedDirectMessage(sicario.discordId, embed);
          if (sent) notifiedCount++;
        }
      }

      console.log(`Sicario-Aufstellung: ${notifiedCount}/${sicarios.length} Sicarios benachrichtigt`);
    } catch (error) {
      console.error('Fehler beim Benachrichtigen der Sicarios:', error);
    }
  }

  // Alle Sicario-Aufstellungen abrufen
  async getAllAufstellungen() {
    return this.prisma.sicarioAufstellung.findMany({
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

  // Kommende Sicario-Aufstellungen
  async getUpcomingAufstellungen() {
    return this.prisma.sicarioAufstellung.findMany({
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

  // Einzelne Aufstellung mit Details
  async getAufstellungById(id: string) {
    const aufstellung = await this.prisma.sicarioAufstellung.findUnique({
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
              },
            },
          },
        },
      },
    });

    if (!aufstellung) {
      throw new NotFoundException('Sicario-Aufstellung nicht gefunden');
    }

    // Alle Sicarios für Statistik
    const allSicarios = await this.getSicarioUsers();

    const respondedUserIds = new Set(aufstellung.responses.map(r => r.userId));
    const sicariosWithoutResponse = allSicarios.filter(s => !respondedUserIds.has(s.id));

    return {
      ...aufstellung,
      stats: {
        total: allSicarios.length,
        coming: aufstellung.responses.filter(r => r.status === AufstellungResponseStatus.COMING).length,
        notComing: aufstellung.responses.filter(r => r.status === AufstellungResponseStatus.NOT_COMING).length,
        unsure: aufstellung.responses.filter(r => r.status === AufstellungResponseStatus.UNSURE).length,
        noResponse: sicariosWithoutResponse.length,
      },
      sicariosWithoutResponse,
    };
  }

  // Auf Aufstellung reagieren
  async respondToAufstellung(
    aufstellungId: string,
    userId: string,
    status: AufstellungResponseStatus,
  ) {
    const aufstellung = await this.prisma.sicarioAufstellung.findUnique({
      where: { id: aufstellungId },
    });

    if (!aufstellung) {
      throw new NotFoundException('Sicario-Aufstellung nicht gefunden');
    }

    // Prüfen ob Deadline bereits abgelaufen
    if (new Date() > aufstellung.deadline) {
      throw new BadRequestException('Die Deadline für diese Aufstellung ist bereits abgelaufen');
    }

    // Prüfen ob User Sicario ist
    const userIsSicario = await this.isSicario(userId);
    const userIsLeadership = await this.isLeadership(userId);
    
    if (!userIsSicario && !userIsLeadership) {
      throw new BadRequestException('Du bist kein Sicario');
    }

    const response = await this.prisma.sicarioAufstellungResponse.upsert({
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

  // Aufstellung löschen
  async deleteAufstellung(id: string) {
    const aufstellung = await this.prisma.sicarioAufstellung.findUnique({
      where: { id },
    });

    if (!aufstellung) {
      throw new NotFoundException('Sicario-Aufstellung nicht gefunden');
    }

    await this.prisma.sicarioAufstellung.delete({
      where: { id },
    });

    return { message: 'Sicario-Aufstellung wurde gelöscht' };
  }

  // Meine ausstehenden Aufstellungen (für Sicarios)
  async getMyPendingAufstellungen(userId: string) {
    const allUpcoming = await this.prisma.sicarioAufstellung.findMany({
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

    return allUpcoming.filter(auf => auf.responses.length === 0);
  }

  // Sicario Team Übersicht
  async getSicarioTeam() {
    const sicarios = await this.getSicarioUsers();
    
    return {
      total: sicarios.length,
      members: sicarios.map(s => ({
        id: s.id,
        username: s.username,
        icFirstName: s.icFirstName,
        icLastName: s.icLastName,
      })),
    };
  }
}

