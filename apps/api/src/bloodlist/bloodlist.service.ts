import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { BloodStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { DiscordService } from '../discord/discord.service';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class BloodListService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private discordService: DiscordService,
    private settingsService: SettingsService,
  ) {}

  // Blood In - Neues Mitglied aufnehmen
  async bloodIn(
    vorname: string,
    nachname: string,
    telefon: number,
    steam: string,
    bloodinDurch: string,
  ) {
    // Prüfe ob Settings konfiguriert sind
    const settings = await this.settingsService.getBloodListSettings();
    if (!settings.isConfigured) {
      throw new BadRequestException(
        'Blood List Channels sind nicht konfiguriert. Bitte zuerst in den Einstellungen festlegen.',
      );
    }

    // Validierung: Telefonnummer bereits bei aktivem Mitglied?
    const existingByPhone = await this.prisma.bloodRecord.findFirst({
      where: {
        telefon,
        status: BloodStatus.ACTIVE,
      },
    });

    if (existingByPhone) {
      throw new BadRequestException(
        `Telefonnummer ${telefon} ist bereits bei einem aktiven Mitglied registriert: ${existingByPhone.vorname} ${existingByPhone.nachname}`,
      );
    }

    // Validierung: Name bereits bei aktivem Mitglied?
    const existingByName = await this.prisma.bloodRecord.findFirst({
      where: {
        vorname,
        nachname,
        status: BloodStatus.ACTIVE,
      },
    });

    if (existingByName) {
      throw new BadRequestException(
        `${vorname} ${nachname} ist bereits ein aktives Mitglied`,
      );
    }

    // Erstelle Blood In Eintrag
    const bloodRecord = await this.prisma.bloodRecord.create({
      data: {
        vorname,
        nachname,
        telefon,
        steam,
        bloodinDurch,
        status: BloodStatus.ACTIVE,
      },
    });

    // Audit Log
    await this.auditService.log({
      userId: null, // System action
      action: 'BLOOD_IN',
      entity: 'BloodRecord',
      entityId: bloodRecord.id,
      meta: {
        vorname,
        nachname,
        telefon,
        steam,
        bloodinDurch,
      },
    });

    // Discord Ankündigung senden
    await this.sendBloodInAnnouncement(vorname, nachname, bloodinDurch, settings.bloodInChannelId);

    return {
      success: true,
      message: `${vorname} ${nachname} wurde erfolgreich aufgenommen`,
      data: bloodRecord,
    };
  }

  // Discord Rollen nach Blood In zuweisen
  private async assignBloodInDiscordRoles(discordId: string): Promise<{ success: number; failed: number }> {
    try {
      const roleIds = await this.settingsService.getBloodInDiscordRoles();
      
      if (!roleIds || roleIds.length === 0) {
        console.log('Keine Blood In Discord Rollen konfiguriert');
        return { success: 0, failed: 0 };
      }

      const result = await this.discordService.addRolesToUser(discordId, roleIds);
      console.log(`Blood In Discord Rollen zugewiesen: ${result.success} erfolgreich, ${result.failed} fehlgeschlagen`);
      return result;
    } catch (error) {
      console.error('Fehler beim Zuweisen der Blood In Discord Rollen:', error);
      return { success: 0, failed: 0 };
    }
  }

  // Discord Blood In Ankündigung
  private async sendBloodInAnnouncement(
    vorname: string,
    nachname: string,
    bloodinDurch: string,
    channelId: string,
  ) {
    try {
      const embed = {
        title: '🩸 BLOOD IN - Neues Familienmitglied!',
        description: `Willkommen in der Familie!`,
        color: 0x22C55E, // Grün
        fields: [
          {
            name: '👤 Name',
            value: `**${vorname} ${nachname}**`,
            inline: true,
          },
          {
            name: '🤝 Aufgenommen von',
            value: bloodinDurch,
            inline: true,
          },
        ],
        footer: {
          text: 'La Santa Calavera - Blood List',
        },
        timestamp: new Date().toISOString(),
      };

      await this.discordService.sendChannelEmbed(channelId, embed);
      console.log(`Blood In Ankündigung für ${vorname} ${nachname} gesendet`);
    } catch (error) {
      console.error('Fehler beim Senden der Blood In Ankündigung:', error);
      // Fehler nicht werfen, Blood In wurde trotzdem erstellt
    }
  }

  // Blood Out - Mitglied entfernen
  async bloodOut(
    identifier: string, // Telefonnummer oder "Vorname Nachname"
    grund: string,
    bloodoutDurch: string,
  ) {
    // Prüfe ob Settings konfiguriert sind
    const settings = await this.settingsService.getBloodListSettings();
    if (!settings.isConfigured) {
      throw new BadRequestException(
        'Blood List Channels sind nicht konfiguriert. Bitte zuerst in den Einstellungen festlegen.',
      );
    }

    let bloodRecord = null;

    // Versuche zuerst als Telefonnummer zu parsen
    const telefonNumber = parseInt(identifier);
    
    if (!isNaN(telefonNumber)) {
      // Suche nach Telefonnummer
      bloodRecord = await this.prisma.bloodRecord.findFirst({
        where: {
          telefon: telefonNumber,
          status: BloodStatus.ACTIVE,
        },
      });
    }

    // Falls nicht gefunden, versuche als Name
    if (!bloodRecord) {
      const nameParts = identifier.trim().split(' ');
      
      if (nameParts.length >= 2) {
        const vorname = nameParts[0];
        const nachname = nameParts.slice(1).join(' ');

        bloodRecord = await this.prisma.bloodRecord.findFirst({
          where: {
            vorname,
            nachname,
            status: BloodStatus.ACTIVE,
          },
        });
      }
    }

    if (!bloodRecord) {
      throw new NotFoundException(
        `Kein aktives Mitglied mit Identifier "${identifier}" gefunden`,
      );
    }

    // Update auf BLOODOUT
    const updatedRecord = await this.prisma.bloodRecord.update({
      where: { id: bloodRecord.id },
      data: {
        status: BloodStatus.BLOODOUT,
        bloodoutTimestamp: new Date(),
        bloodoutDurch,
        bloodoutGrund: grund,
      },
    });

    // Versuche den zugehörigen Discord User zu finden und zu kicken
    const kickedDiscordUser = await this.kickAssociatedDiscordUser(
      updatedRecord.vorname,
      updatedRecord.nachname,
      grund,
    );

    // Audit Log
    await this.auditService.log({
      userId: null, // System action
      action: 'BLOOD_OUT',
      entity: 'BloodRecord',
      entityId: updatedRecord.id,
      meta: {
        vorname: updatedRecord.vorname,
        nachname: updatedRecord.nachname,
        telefon: updatedRecord.telefon,
        grund,
        bloodoutDurch,
        kickedFromDiscord: kickedDiscordUser,
      },
    });

    // Discord Ankündigung senden
    await this.sendBloodOutAnnouncement(
      updatedRecord.vorname,
      updatedRecord.nachname,
      grund,
      bloodoutDurch,
      settings.bloodOutChannelId,
    );

    return {
      success: true,
      message: `${updatedRecord.vorname} ${updatedRecord.nachname} wurde erfolgreich aus der Family entfernt${kickedDiscordUser ? ' und vom Discord gekickt' : ''}`,
      data: {
        vorname: updatedRecord.vorname,
        nachname: updatedRecord.nachname,
        telefon: updatedRecord.telefon,
        grund,
        kickedFromDiscord: kickedDiscordUser,
      },
    };
  }

  // Discord User bei Blood Out kicken
  private async kickAssociatedDiscordUser(
    vorname: string,
    nachname: string,
    grund: string,
  ): Promise<boolean> {
    try {
      // Versuche den User in der Datenbank zu finden basierend auf IC-Name
      const dbUser = await this.prisma.user.findFirst({
        where: {
          OR: [
            {
              icFirstName: vorname,
              icLastName: nachname,
            },
            {
              // Fallback: Username enthält beide Namen
              username: {
                contains: `${vorname} ${nachname}`,
              },
            },
          ],
        },
      });

      if (dbUser?.discordId) {
        // User vom Discord kicken
        const kicked = await this.discordService.kickUser(
          dbUser.discordId,
          `Blood Out: ${grund}`,
        );

        if (kicked) {
          // User aus der Datenbank löschen (optional, da syncDiscordMembers das auch macht)
          console.log(`Discord User ${dbUser.username} (${dbUser.discordId}) wurde gekickt`);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Fehler beim Kicken des Discord Users:', error);
      return false;
    }
  }

  // Discord Blood Out Ankündigung
  private async sendBloodOutAnnouncement(
    vorname: string,
    nachname: string,
    grund: string,
    bloodoutDurch: string,
    channelId: string,
  ) {
    try {
      const embed = {
        title: '💀 BLOOD OUT',
        description: `Ein Mitglied hat die Familie verlassen.`,
        color: 0xDC2626, // Rot
        fields: [
          {
            name: '👤 Name',
            value: `**${vorname} ${nachname}**`,
            inline: true,
          },
          {
            name: '⚖️ Entschieden von',
            value: bloodoutDurch,
            inline: true,
          },
          {
            name: '📝 Grund',
            value: grund || 'Kein Grund angegeben',
            inline: false,
          },
        ],
        footer: {
          text: 'La Santa Calavera - Blood List',
        },
        timestamp: new Date().toISOString(),
      };

      await this.discordService.sendChannelEmbed(channelId, embed);
      console.log(`Blood Out Ankündigung für ${vorname} ${nachname} gesendet`);
    } catch (error) {
      console.error('Fehler beim Senden der Blood Out Ankündigung:', error);
      // Fehler nicht werfen, Blood Out wurde trotzdem durchgeführt
    }
  }

  // Aktive Blood List abrufen
  async getActiveBloodList() {
    const activeMembers = await this.prisma.bloodRecord.findMany({
      where: {
        status: BloodStatus.ACTIVE,
      },
      orderBy: {
        bloodinTimestamp: 'desc',
      },
    });

    return activeMembers;
  }

  // Blood Out Historie abrufen
  async getBloodOutHistory() {
    const bloodOuts = await this.prisma.bloodRecord.findMany({
      where: {
        status: BloodStatus.BLOODOUT,
      },
      orderBy: {
        bloodoutTimestamp: 'desc',
      },
    });

    return bloodOuts;
  }

  // Alle Records abrufen (für Admin)
  async getAllRecords() {
    const allRecords = await this.prisma.bloodRecord.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return allRecords;
  }

  // Einzelnen Record abrufen
  async getRecordById(id: string) {
    const record = await this.prisma.bloodRecord.findUnique({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException('Record nicht gefunden');
    }

    return record;
  }

  // Statistiken
  async getStats() {
    const totalActive = await this.prisma.bloodRecord.count({
      where: { status: BloodStatus.ACTIVE },
    });

    const totalBloodOuts = await this.prisma.bloodRecord.count({
      where: { status: BloodStatus.BLOODOUT },
    });

    const totalRecords = await this.prisma.bloodRecord.count();

    // Letzte 5 Blood Ins
    const recentBloodIns = await this.prisma.bloodRecord.findMany({
      where: { status: BloodStatus.ACTIVE },
      orderBy: { bloodinTimestamp: 'desc' },
      take: 5,
    });

    // Letzte 5 Blood Outs
    const recentBloodOuts = await this.prisma.bloodRecord.findMany({
      where: { status: BloodStatus.BLOODOUT },
      orderBy: { bloodoutTimestamp: 'desc' },
      take: 5,
    });

    return {
      totalActive,
      totalBloodOuts,
      totalRecords,
      recentBloodIns,
      recentBloodOuts,
    };
  }

  // Suche
  async searchRecords(query: string) {
    const searchNumber = parseInt(query);

    return this.prisma.bloodRecord.findMany({
      where: {
        OR: [
          {
            vorname: {
              contains: query,
            },
          },
          {
            nachname: {
              contains: query,
            },
          },
          {
            steam: {
              contains: query,
            },
          },
          ...(isNaN(searchNumber)
            ? []
            : [
                {
                  telefon: searchNumber,
                },
              ]),
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // Alle Discord User holen die noch nicht in der Blood List sind
  async getUnassignedDiscordUsers() {
    // Alle Discord Member mit erlaubten Rollen holen
    const discordMembers = await this.discordService.getMembersWithAllowedRoles();
    
    // Alle aktiven Blood Records holen
    const activeBloodRecords = await this.prisma.bloodRecord.findMany({
      where: { status: BloodStatus.ACTIVE },
    });

    // Alle registrierten DB-User holen (mit IC-Namen)
    const dbUsers = await this.prisma.user.findMany({
      select: {
        id: true,
        discordId: true,
        username: true,
        icFirstName: true,
        icLastName: true,
      },
    });

    // Set von Blood Record Namen (lowercase für Vergleich)
    const bloodRecordNames = new Set(
      activeBloodRecords.map(r => `${r.vorname} ${r.nachname}`.toLowerCase().trim())
    );

    // Prüfe für jeden Discord Member ob er ein Blood Record hat
    const unassignedMembers = discordMembers.filter(member => {
      // Finde den DB-User für diesen Discord Member
      const dbUser = dbUsers.find(u => u.discordId === member.discordId);
      
      if (!dbUser) {
        // User ist nicht mal in der DB - definitiv kein Blood Record
        return true;
      }

      // Prüfe ob der IC-Name des Users in den Blood Records ist
      if (dbUser.icFirstName && dbUser.icLastName) {
        const icName = `${dbUser.icFirstName} ${dbUser.icLastName}`.toLowerCase().trim();
        if (bloodRecordNames.has(icName)) {
          // User hat ein Blood Record
          return false;
        }
      }

      // Prüfe auch ob der Discord Username in den Blood Records ist
      const username = member.username.toLowerCase().trim();
      if (bloodRecordNames.has(username)) {
        return false;
      }

      // Kein Blood Record gefunden - User ist unassigned
      return true;
    });

    // Füge DB-User Infos hinzu wenn verfügbar
    const enrichedMembers = unassignedMembers.map(member => {
      const dbUser = dbUsers.find(u => u.discordId === member.discordId);
      return {
        discordId: member.discordId,
        username: member.username,
        avatar: member.avatar,
        highestSystemRole: member.highestSystemRole,
        joinedAt: member.joinedAt,
        // Zusätzliche Infos vom DB-User wenn vorhanden
        icFirstName: dbUser?.icFirstName || null,
        icLastName: dbUser?.icLastName || null,
        isInDatabase: !!dbUser,
      };
    });

    return {
      unassignedDiscordUsers: enrichedMembers,
      totalDiscordMembers: discordMembers.length,
      totalUnassigned: enrichedMembers.length,
      totalBloodRecords: activeBloodRecords.length,
    };
  }

  // Ghost Users finden - Blood Records von Usern die nicht mehr im Discord sind
  async getGhostUsers() {
    // Alle aktiven Blood Records holen
    const activeBloodRecords = await this.prisma.bloodRecord.findMany({
      where: { status: BloodStatus.ACTIVE },
    });

    // Alle Discord Member holen
    const discordMembers = await this.discordService.getAllServerMembers();
    const discordMemberIds = new Set(discordMembers.map((m: any) => m.user.id));

    // Alle DB-User die mit Blood Records verknüpft sein könnten
    const dbUsers = await this.prisma.user.findMany({
      select: {
        id: true,
        discordId: true,
        username: true,
        icFirstName: true,
        icLastName: true,
      },
    });

    // Ghost Users finden - DB-User die nicht mehr im Discord sind
    const ghostDbUsers = dbUsers.filter(user => !discordMemberIds.has(user.discordId));

    // Blood Records die zu Ghost Users gehören könnten (basierend auf Name-Match)
    const potentialGhostBloodRecords = activeBloodRecords.filter(record => {
      const matchingGhost = ghostDbUsers.find(user => {
        const icName = `${user.icFirstName || ''} ${user.icLastName || ''}`.trim().toLowerCase();
        const bloodName = `${record.vorname} ${record.nachname}`.trim().toLowerCase();
        return icName === bloodName || user.username.toLowerCase() === bloodName;
      });
      return !!matchingGhost;
    });

    return {
      ghostUsers: ghostDbUsers.map(user => ({
        userId: user.id,
        discordId: user.discordId,
        username: user.username,
        icFirstName: user.icFirstName,
        icLastName: user.icLastName,
        // Verknüpftes Blood Record finden
        linkedBloodRecord: potentialGhostBloodRecords.find(record => {
          const icName = `${user.icFirstName || ''} ${user.icLastName || ''}`.trim().toLowerCase();
          const bloodName = `${record.vorname} ${record.nachname}`.trim().toLowerCase();
          return icName === bloodName || user.username.toLowerCase() === bloodName;
        }),
      })),
      totalGhostUsers: ghostDbUsers.length,
    };
  }

  // Discord User mit Blood Record verknüpfen (Blood In für existierenden Discord User)
  async linkDiscordUserToBloodRecord(
    discordId: string,
    vorname: string,
    nachname: string,
    telefon: number,
    steam: string,
    bloodinDurch: string,
  ) {
    // Prüfe ob Settings konfiguriert sind
    const settings = await this.settingsService.getBloodListSettings();
    if (!settings.isConfigured) {
      throw new BadRequestException(
        'Blood List Channels sind nicht konfiguriert. Bitte zuerst in den Einstellungen festlegen.',
      );
    }

    // Prüfen ob Discord User existiert
    const discordMembers = await this.discordService.getAllServerMembers();
    const discordMember = discordMembers.find((m: any) => m.user.id === discordId);

    if (!discordMember) {
      throw new NotFoundException('Discord User nicht im Server gefunden');
    }

    // Prüfen ob bereits ein Blood Record existiert
    const existingRecord = await this.prisma.bloodRecord.findFirst({
      where: {
        vorname,
        nachname,
        status: BloodStatus.ACTIVE,
      },
    });

    if (existingRecord) {
      throw new BadRequestException(`${vorname} ${nachname} ist bereits ein aktives Mitglied`);
    }

    // Blood Record erstellen
    const bloodRecord = await this.prisma.bloodRecord.create({
      data: {
        vorname,
        nachname,
        telefon,
        steam,
        bloodinDurch,
        status: BloodStatus.ACTIVE,
      },
    });

    // Falls User noch nicht in DB existiert, importieren
    let dbUser = await this.prisma.user.findUnique({
      where: { discordId },
    });

    if (!dbUser) {
      dbUser = await this.discordService.importMemberToDatabase(discordId);
    }

    // IC Name setzen
    if (dbUser && (!dbUser.icFirstName || !dbUser.icLastName)) {
      await this.prisma.user.update({
        where: { id: dbUser.id },
        data: {
          icFirstName: vorname,
          icLastName: nachname,
        },
      });
    }

    // Audit Log
    await this.auditService.log({
      userId: null,
      action: 'BLOOD_IN_LINKED',
      entity: 'BloodRecord',
      entityId: bloodRecord.id,
      meta: {
        discordId,
        vorname,
        nachname,
        telefon,
        steam,
        bloodinDurch,
      },
    });

    // Discord Ankündigung senden
    await this.sendBloodInAnnouncement(vorname, nachname, bloodinDurch, settings.bloodInChannelId);

    // Discord Rollen zuweisen
    const rolesResult = await this.assignBloodInDiscordRoles(discordId);

    return {
      success: true,
      message: `${vorname} ${nachname} wurde erfolgreich mit Discord User verknüpft`,
      data: bloodRecord,
      discordRolesAssigned: rolesResult.success,
    };
  }

  // Settings-Status abrufen (für Frontend um zu prüfen ob Funktionen erlaubt sind)
  async getBloodListStatus() {
    const settings = await this.settingsService.getBloodListSettings();
    return {
      isConfigured: settings.isConfigured,
      bloodInChannelId: settings.bloodInChannelId,
      bloodOutChannelId: settings.bloodOutChannelId,
    };
  }
}

