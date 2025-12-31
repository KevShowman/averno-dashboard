import { Injectable, ForbiddenException, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { DiscordService } from '../discord/discord.service';
import { Role, PartnerAccessStatus, SuggestionStatus, PartnerSuggestionType } from '@prisma/client';

const LEADERSHIP_ROLES: Role[] = [
  Role.EL_PATRON,
  Role.DON_CAPITAN,
  Role.DON_COMANDANTE,
  Role.EL_MANO_DERECHA,
  Role.ADMIN,
];

@Injectable()
export class PartnerService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private discordService: DiscordService,
  ) {}

  // ============ HELPER METHODS ============

  private isLeadership(user: any): boolean {
    return LEADERSHIP_ROLES.includes(user.role);
  }

  private async canManagePartners(user: any): Promise<boolean> {
    if (this.isLeadership(user)) return true;
    
    const permission = await this.prisma.partnerManagementPermission.findUnique({
      where: { userId: user.id },
    });
    return !!permission;
  }

  // ============ PARTNER ACCESS REQUESTS ============

  // Partner-Zugangsanfrage einreichen (öffentlicher Endpoint nach Discord-Login)
  async submitPartnerAccessRequest(data: {
    discordId: string;
    username: string;
    avatarUrl?: string;
    familyName: string;
    reason: string;
  }) {
    if (!data.familyName || !data.reason) {
      throw new BadRequestException('Familie und Begründung sind erforderlich');
    }

    // Prüfe ob bereits eine Anfrage existiert
    const existingRequest = await this.prisma.partnerAccessRequest.findUnique({
      where: { discordId: data.discordId },
    });

    if (existingRequest) {
      if (existingRequest.status === PartnerAccessStatus.APPROVED) {
        throw new ConflictException('Partner-Zugang wurde bereits genehmigt');
      }
      if (existingRequest.status === PartnerAccessStatus.PENDING) {
        throw new ConflictException('Partner-Zugangsanfrage ist bereits ausstehend');
      }
      // Bei REJECTED kann eine neue Anfrage gestellt werden
      const updatedRequest = await this.prisma.partnerAccessRequest.update({
        where: { discordId: data.discordId },
        data: {
          username: data.username,
          avatarUrl: data.avatarUrl,
          familyName: data.familyName,
          reason: data.reason,
          status: PartnerAccessStatus.PENDING,
          reviewedById: null,
          reviewedAt: null,
          reviewNote: null,
        },
      });

      // Note: No audit log for external partner requests (no valid user ID yet)
      // The request itself is stored in partner_access_requests table

      // Discord Benachrichtigung
      try {
        await this.discordService.sendPartnerRequestNotification(
          data.username,
          data.familyName,
          data.reason,
          true, // isReRequest
        );
      } catch (error) {
        console.error('Discord notification failed:', error);
      }

      return { 
        success: true, 
        message: 'Partner-Zugangsanfrage wurde erneut eingereicht',
        id: updatedRequest.id,
      };
    }

    // Neue Anfrage erstellen
    const newRequest = await this.prisma.partnerAccessRequest.create({
      data: {
        discordId: data.discordId,
        username: data.username,
        avatarUrl: data.avatarUrl,
        familyName: data.familyName,
        reason: data.reason,
      },
    });

    // Note: No audit log for external partner requests (no valid user ID yet)
    // The request itself is stored in partner_access_requests table

    // Discord Benachrichtigung
    try {
      await this.discordService.sendPartnerRequestNotification(
        data.username,
        data.familyName,
        data.reason,
        false, // isReRequest
      );
    } catch (error) {
      console.error('Discord notification failed:', error);
    }

    return { 
      success: true, 
      message: 'Partner-Zugangsanfrage wurde eingereicht',
      id: newRequest.id,
    };
  }

  // Partner-Zugangsanfrage erstellen (wird beim Partner-Login aufgerufen)
  async createAccessRequest(discordId: string, username: string, avatarUrl?: string) {
    // Prüfe ob bereits eine Anfrage existiert
    const existingRequest = await this.prisma.partnerAccessRequest.findUnique({
      where: { discordId },
    });

    if (existingRequest) {
      if (existingRequest.status === PartnerAccessStatus.APPROVED) {
        throw new ConflictException('Partner-Zugang wurde bereits genehmigt');
      }
      if (existingRequest.status === PartnerAccessStatus.PENDING) {
        throw new ConflictException('Partner-Zugangsanfrage ist bereits ausstehend');
      }
      // Bei REJECTED kann eine neue Anfrage gestellt werden
      return this.prisma.partnerAccessRequest.update({
        where: { discordId },
        data: {
          username,
          avatarUrl,
          status: PartnerAccessStatus.PENDING,
          reviewedById: null,
          reviewedAt: null,
          reviewNote: null,
        },
      });
    }

    return this.prisma.partnerAccessRequest.create({
      data: {
        discordId,
        username,
        avatarUrl,
      },
    });
  }

  // Alle Partner-Zugangsanfragen abrufen
  async getAllAccessRequests(user: any) {
    const canManage = await this.canManagePartners(user);
    if (!canManage) {
      throw new ForbiddenException('Keine Berechtigung zur Partner-Verwaltung');
    }

    return this.prisma.partnerAccessRequest.findMany({
      include: {
        reviewedBy: {
          select: {
            id: true,
            username: true,
            icFirstName: true,
            icLastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Ausstehende Partner-Zugangsanfragen abrufen
  async getPendingAccessRequests(user: any) {
    const canManage = await this.canManagePartners(user);
    if (!canManage) {
      throw new ForbiddenException('Keine Berechtigung zur Partner-Verwaltung');
    }

    return this.prisma.partnerAccessRequest.findMany({
      where: { status: PartnerAccessStatus.PENDING },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Anzahl ausstehender Anfragen (für Badge)
  async getPendingRequestCount(user: any): Promise<number> {
    const canManage = await this.canManagePartners(user);
    if (!canManage) return 0;

    return this.prisma.partnerAccessRequest.count({
      where: { status: PartnerAccessStatus.PENDING },
    });
  }

  // Partner-Zugangsanfrage genehmigen
  async approveAccessRequest(user: any, requestId: string) {
    const canManage = await this.canManagePartners(user);
    if (!canManage) {
      throw new ForbiddenException('Keine Berechtigung zur Partner-Verwaltung');
    }

    const request = await this.prisma.partnerAccessRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Anfrage nicht gefunden');
    }

    if (request.status !== PartnerAccessStatus.PENDING) {
      throw new BadRequestException('Anfrage wurde bereits bearbeitet');
    }

    // Prüfe ob User bereits in der DB existiert
    let partnerUser = await this.prisma.user.findUnique({
      where: { discordId: request.discordId },
    });

    if (partnerUser) {
      // User existiert bereits - markiere als Partner
      partnerUser = await this.prisma.user.update({
        where: { id: partnerUser.id },
        data: {
          isPartner: true,
          role: Role.PARTNER,
          allRoles: [Role.PARTNER],
        },
      });
    } else {
      // Erstelle neuen Partner-User
      partnerUser = await this.prisma.user.create({
        data: {
          discordId: request.discordId,
          username: request.username,
          avatarUrl: request.avatarUrl,
          role: Role.PARTNER,
          allRoles: [Role.PARTNER],
          isPartner: true,
        },
      });
    }

    // Anfrage aktualisieren
    const approvedRequest = await this.prisma.partnerAccessRequest.update({
      where: { id: requestId },
      data: {
        status: PartnerAccessStatus.APPROVED,
        reviewedById: user.id,
        reviewedAt: new Date(),
      },
      include: {
        reviewedBy: {
          select: {
            id: true,
            username: true,
            icFirstName: true,
            icLastName: true,
          },
        },
      },
    });

    // Audit Log
    await this.auditService.log({
      userId: user.id,
      action: 'PARTNER_ACCESS_APPROVED',
      entity: 'PartnerAccessRequest',
      entityId: requestId,
      meta: {
        partnerDiscordId: request.discordId,
        partnerUsername: request.username,
      },
    });

    return approvedRequest;
  }

  // Partner-Zugangsanfrage ablehnen
  async rejectAccessRequest(user: any, requestId: string, reviewNote?: string) {
    const canManage = await this.canManagePartners(user);
    if (!canManage) {
      throw new ForbiddenException('Keine Berechtigung zur Partner-Verwaltung');
    }

    const request = await this.prisma.partnerAccessRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Anfrage nicht gefunden');
    }

    if (request.status !== PartnerAccessStatus.PENDING) {
      throw new BadRequestException('Anfrage wurde bereits bearbeitet');
    }

    const rejectedRequest = await this.prisma.partnerAccessRequest.update({
      where: { id: requestId },
      data: {
        status: PartnerAccessStatus.REJECTED,
        reviewedById: user.id,
        reviewedAt: new Date(),
        reviewNote,
      },
      include: {
        reviewedBy: {
          select: {
            id: true,
            username: true,
            icFirstName: true,
            icLastName: true,
          },
        },
      },
    });

    // Audit Log
    await this.auditService.log({
      userId: user.id,
      action: 'PARTNER_ACCESS_REJECTED',
      entity: 'PartnerAccessRequest',
      entityId: requestId,
      meta: {
        partnerDiscordId: request.discordId,
        partnerUsername: request.username,
        reviewNote,
      },
    });

    return rejectedRequest;
  }

  // Partner-Zugang widerrufen
  async revokePartnerAccess(user: any, partnerUserId: string) {
    const canManage = await this.canManagePartners(user);
    if (!canManage) {
      throw new ForbiddenException('Keine Berechtigung zur Partner-Verwaltung');
    }

    const partnerUser = await this.prisma.user.findUnique({
      where: { id: partnerUserId },
    });

    if (!partnerUser) {
      throw new NotFoundException('Partner nicht gefunden');
    }

    if (!partnerUser.isPartner) {
      throw new BadRequestException('Benutzer ist kein Partner');
    }

    // Partner-Status entfernen
    await this.prisma.user.update({
      where: { id: partnerUserId },
      data: {
        isPartner: false,
      },
    });

    // Access Request Status auf REJECTED setzen
    await this.prisma.partnerAccessRequest.updateMany({
      where: { discordId: partnerUser.discordId },
      data: {
        status: PartnerAccessStatus.REJECTED,
        reviewedById: user.id,
        reviewedAt: new Date(),
        reviewNote: 'Zugang widerrufen',
      },
    });

    // Audit Log
    await this.auditService.log({
      userId: user.id,
      action: 'PARTNER_ACCESS_REVOKED',
      entity: 'User',
      entityId: partnerUserId,
      meta: {
        partnerUsername: partnerUser.username,
      },
    });

    return { success: true };
  }

  // Alle aktiven Partner abrufen
  async getActivePartners(user: any) {
    const canManage = await this.canManagePartners(user);
    if (!canManage) {
      throw new ForbiddenException('Keine Berechtigung zur Partner-Verwaltung');
    }

    return this.prisma.user.findMany({
      where: { isPartner: true },
      select: {
        id: true,
        discordId: true,
        username: true,
        avatarUrl: true,
        createdAt: true,
      },
      orderBy: { username: 'asc' },
    });
  }

  // ============ PARTNER MANAGEMENT PERMISSIONS ============

  // Berechtigung zur Partner-Verwaltung erteilen
  async grantPartnerManagementPermission(user: any, userId: string) {
    if (!this.isLeadership(user)) {
      throw new ForbiddenException('Nur Leadership kann Partner-Verwaltungsberechtigungen erteilen');
    }

    // Prüfe ob User existiert
    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, isPartner: true },
    });

    if (!targetUser) {
      throw new NotFoundException('Benutzer nicht gefunden');
    }

    if (targetUser.isPartner) {
      throw new BadRequestException('Partner können keine Partner-Verwaltungsberechtigungen erhalten');
    }

    // Prüfe ob Berechtigung bereits existiert
    const existing = await this.prisma.partnerManagementPermission.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new ConflictException('Berechtigung existiert bereits');
    }

    const permission = await this.prisma.partnerManagementPermission.create({
      data: {
        userId,
        grantedById: user.id,
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

    // Audit Log
    await this.auditService.log({
      userId: user.id,
      action: 'PARTNER_PERMISSION_GRANTED',
      entity: 'PartnerManagementPermission',
      entityId: permission.id,
      meta: {
        targetUserId: userId,
        targetUsername: targetUser.username,
      },
    });

    return permission;
  }

  // Berechtigung zur Partner-Verwaltung entziehen
  async revokePartnerManagementPermission(user: any, userId: string) {
    if (!this.isLeadership(user)) {
      throw new ForbiddenException('Nur Leadership kann Partner-Verwaltungsberechtigungen entziehen');
    }

    const permission = await this.prisma.partnerManagementPermission.findUnique({
      where: { userId },
      include: {
        user: {
          select: { username: true },
        },
      },
    });

    if (!permission) {
      throw new NotFoundException('Berechtigung nicht gefunden');
    }

    await this.prisma.partnerManagementPermission.delete({
      where: { userId },
    });

    // Audit Log
    await this.auditService.log({
      userId: user.id,
      action: 'PARTNER_PERMISSION_REVOKED',
      entity: 'PartnerManagementPermission',
      entityId: permission.id,
      meta: {
        targetUserId: userId,
        targetUsername: permission.user.username,
      },
    });

    return { success: true };
  }

  // Alle Partner-Verwaltungsberechtigungen abrufen
  async getAllPartnerManagementPermissions(user: any) {
    if (!this.isLeadership(user)) {
      throw new ForbiddenException('Nur Leadership kann Berechtigungen einsehen');
    }

    return this.prisma.partnerManagementPermission.findMany({
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
        grantedBy: {
          select: {
            id: true,
            username: true,
            icFirstName: true,
            icLastName: true,
          },
        },
      },
      orderBy: { grantedAt: 'desc' },
    });
  }

  // ============ PARTNER FAMILY SUGGESTIONS ============

  // Vorschlag erstellen (nur für Partner)
  async createFamilySuggestion(user: any, data: {
    type: PartnerSuggestionType;
    familyContactId?: string;
    familyName: string;
    familyStatus?: string;
    propertyZip?: string;
    contact1FirstName?: string;
    contact1LastName?: string;
    contact1Phone?: string;
    contact2FirstName?: string;
    contact2LastName?: string;
    contact2Phone?: string;
    notes?: string;
    mapName?: string;
    mapX?: number;
    mapY?: number;
    mapIcon?: string;
  }) {
    if (!user.isPartner) {
      throw new ForbiddenException('Nur Partner können Vorschläge erstellen');
    }

    // Bei UPDATE muss familyContactId vorhanden sein
    if (data.type === PartnerSuggestionType.UPDATE && !data.familyContactId) {
      throw new BadRequestException('Bei UPDATE-Vorschlägen muss eine Familie ausgewählt werden');
    }

    // Prüfe ob Familie existiert (bei UPDATE)
    if (data.familyContactId) {
      const family = await this.prisma.familyContact.findUnique({
        where: { id: data.familyContactId },
      });
      if (!family) {
        throw new NotFoundException('Familie nicht gefunden');
      }
    }

    const suggestion = await this.prisma.partnerFamilySuggestion.create({
      data: {
        type: data.type,
        familyContactId: data.familyContactId,
        familyName: data.familyName,
        familyStatus: data.familyStatus as any,
        propertyZip: data.propertyZip,
        contact1FirstName: data.contact1FirstName,
        contact1LastName: data.contact1LastName,
        contact1Phone: data.contact1Phone,
        contact2FirstName: data.contact2FirstName,
        contact2LastName: data.contact2LastName,
        contact2Phone: data.contact2Phone,
        notes: data.notes,
        mapName: data.mapName as any,
        mapX: data.mapX,
        mapY: data.mapY,
        mapIcon: data.mapIcon,
        createdById: user.id,
      },
      // Don't include contact details in response - partner should not see them again
      select: {
        id: true,
        type: true,
        familyName: true,
        familyStatus: true,
        propertyZip: true,
        suggestionStatus: true,
        reviewNote: true,
        createdAt: true,
        reviewedAt: true,
      },
    });

    // Audit Log
    await this.auditService.log({
      userId: user.id,
      action: 'PARTNER_SUGGESTION_CREATED',
      entity: 'PartnerFamilySuggestion',
      entityId: suggestion.id,
      meta: {
        type: data.type,
        familyName: data.familyName,
        hasContactData: !!(data.contact1FirstName || data.contact1Phone || data.contact2FirstName || data.contact2Phone),
      },
    });

    return suggestion;
  }

  // Alle Vorschläge abrufen (für Partner-Verwaltung)
  async getAllFamilySuggestions(user: any) {
    const canManage = await this.canManagePartners(user);
    if (!canManage && !user.isPartner) {
      throw new ForbiddenException('Keine Berechtigung');
    }

    // Partner sehen nur eigene Vorschläge
    const isPartnerOnly = user.isPartner && !canManage;
    const where = isPartnerOnly ? { createdById: user.id } : {};

    const suggestions = await this.prisma.partnerFamilySuggestion.findMany({
      where,
      include: {
        familyContact: {
          select: {
            id: true,
            familyName: true,
            status: true,
            mapAnnotations: {
              select: {
                id: true,
                mapName: true,
                x: true,
                y: true,
              },
              take: 1, // Nur erste Annotation
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            username: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            username: true,
            icFirstName: true,
            icLastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Partner sollen ihre eingereichten Kontaktdaten nicht sehen können
    if (isPartnerOnly) {
      return suggestions.map(s => ({
        ...s,
        contact1FirstName: undefined,
        contact1LastName: undefined,
        contact1Phone: undefined,
        contact2FirstName: undefined,
        contact2LastName: undefined,
        contact2Phone: undefined,
        notes: undefined, // Notizen auch ausblenden
      }));
    }

    return suggestions;
  }

  // Ausstehende Vorschläge abrufen
  async getPendingFamilySuggestions(user: any) {
    const canManage = await this.canManagePartners(user);
    if (!canManage) {
      throw new ForbiddenException('Keine Berechtigung zur Partner-Verwaltung');
    }

    return this.prisma.partnerFamilySuggestion.findMany({
      where: { suggestionStatus: SuggestionStatus.PENDING },
      include: {
        familyContact: {
          select: {
            id: true,
            familyName: true,
            status: true,
            propertyZip: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Anzahl ausstehender Vorschläge (für Badge)
  async getPendingSuggestionCount(user: any): Promise<number> {
    const canManage = await this.canManagePartners(user);
    if (!canManage) return 0;

    return this.prisma.partnerFamilySuggestion.count({
      where: { suggestionStatus: SuggestionStatus.PENDING },
    });
  }

  // Vorschlag genehmigen (erstellt/aktualisiert FamilyContact)
  async approveFamilySuggestion(user: any, suggestionId: string) {
    const canManage = await this.canManagePartners(user);
    if (!canManage) {
      throw new ForbiddenException('Keine Berechtigung zur Partner-Verwaltung');
    }

    const suggestion = await this.prisma.partnerFamilySuggestion.findUnique({
      where: { id: suggestionId },
    });

    if (!suggestion) {
      throw new NotFoundException('Vorschlag nicht gefunden');
    }

    if (suggestion.suggestionStatus !== SuggestionStatus.PENDING) {
      throw new BadRequestException('Vorschlag wurde bereits bearbeitet');
    }

    // Je nach Typ: CREATE, UPDATE oder DELETE
    if (suggestion.type === PartnerSuggestionType.DELETE) {
      // Löschung durchführen
      if (!suggestion.familyContactId) {
        throw new BadRequestException('Keine Familie zum Löschen angegeben');
      }

      // Zuerst MapAnnotations löschen
      await this.prisma.mapAnnotation.deleteMany({
        where: { familyContactId: suggestion.familyContactId },
      });

      // Dann FamilyContact löschen
      await this.prisma.familyContact.delete({
        where: { id: suggestion.familyContactId },
      });
    } else if (suggestion.type === PartnerSuggestionType.CREATE) {
      // Neue Familie erstellen
      const newFamily = await this.prisma.familyContact.create({
        data: {
          familyName: suggestion.familyName,
          status: suggestion.familyStatus || 'UNKNOWN',
          propertyZip: suggestion.propertyZip,
          notes: suggestion.notes,
          createdById: user.id,
        },
      });

      // Wenn Map-Daten vorhanden, MapAnnotation erstellen
      if (suggestion.mapName && suggestion.mapX !== null && suggestion.mapY !== null) {
        await this.prisma.mapAnnotation.create({
          data: {
            mapName: suggestion.mapName,
            x: suggestion.mapX,
            y: suggestion.mapY,
            icon: suggestion.mapIcon || 'home',
            label: suggestion.familyName,
            familyContactId: newFamily.id,
            createdById: user.id,
          },
        });
      }
    } else {
      // Bestehende Familie aktualisieren
      if (!suggestion.familyContactId) {
        throw new BadRequestException('Keine Familie zum Aktualisieren angegeben');
      }

      // Hole aktuelle Notizen für Append-Logik
      const existingFamily = await this.prisma.familyContact.findUnique({
        where: { id: suggestion.familyContactId },
        select: { notes: true },
      });
      
      const updatedNotes = suggestion.notes 
        ? (existingFamily?.notes 
            ? `${existingFamily.notes}\n[Partner-Update] ${suggestion.notes}` 
            : `[Partner-Update] ${suggestion.notes}`)
        : undefined;

      await this.prisma.familyContact.update({
        where: { id: suggestion.familyContactId },
        data: {
          familyName: suggestion.familyName,
          status: suggestion.familyStatus || undefined,
          propertyZip: suggestion.propertyZip || undefined,
          notes: updatedNotes,
        },
      });

      // Wenn Map-Daten vorhanden, MapAnnotation aktualisieren oder erstellen
      if (suggestion.mapName && suggestion.mapX !== null && suggestion.mapY !== null) {
        const existingAnnotation = await this.prisma.mapAnnotation.findFirst({
          where: { familyContactId: suggestion.familyContactId },
        });

        if (existingAnnotation) {
          await this.prisma.mapAnnotation.update({
            where: { id: existingAnnotation.id },
            data: {
              mapName: suggestion.mapName,
              x: suggestion.mapX,
              y: suggestion.mapY,
              icon: suggestion.mapIcon || existingAnnotation.icon,
            },
          });
        } else {
          await this.prisma.mapAnnotation.create({
            data: {
              mapName: suggestion.mapName,
              x: suggestion.mapX,
              y: suggestion.mapY,
              icon: suggestion.mapIcon || 'home',
              label: suggestion.familyName,
              familyContactId: suggestion.familyContactId,
              createdById: user.id,
            },
          });
        }
      }
    }

    // Vorschlag als genehmigt markieren
    const approvedSuggestion = await this.prisma.partnerFamilySuggestion.update({
      where: { id: suggestionId },
      data: {
        suggestionStatus: SuggestionStatus.APPROVED,
        reviewedById: user.id,
        reviewedAt: new Date(),
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    // Audit Log
    await this.auditService.log({
      userId: user.id,
      action: 'PARTNER_SUGGESTION_APPROVED',
      entity: 'PartnerFamilySuggestion',
      entityId: suggestionId,
      meta: {
        type: suggestion.type,
        familyName: suggestion.familyName,
        partnerUsername: approvedSuggestion.createdBy.username,
      },
    });

    return approvedSuggestion;
  }

  // Vorschlag ablehnen
  async rejectFamilySuggestion(user: any, suggestionId: string, reviewNote?: string) {
    const canManage = await this.canManagePartners(user);
    if (!canManage) {
      throw new ForbiddenException('Keine Berechtigung zur Partner-Verwaltung');
    }

    const suggestion = await this.prisma.partnerFamilySuggestion.findUnique({
      where: { id: suggestionId },
    });

    if (!suggestion) {
      throw new NotFoundException('Vorschlag nicht gefunden');
    }

    if (suggestion.suggestionStatus !== SuggestionStatus.PENDING) {
      throw new BadRequestException('Vorschlag wurde bereits bearbeitet');
    }

    const rejectedSuggestion = await this.prisma.partnerFamilySuggestion.update({
      where: { id: suggestionId },
      data: {
        suggestionStatus: SuggestionStatus.REJECTED,
        reviewedById: user.id,
        reviewedAt: new Date(),
        reviewNote,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    // Audit Log
    await this.auditService.log({
      userId: user.id,
      action: 'PARTNER_SUGGESTION_REJECTED',
      entity: 'PartnerFamilySuggestion',
      entityId: suggestionId,
      meta: {
        type: suggestion.type,
        familyName: suggestion.familyName,
        partnerUsername: rejectedSuggestion.createdBy.username,
        reviewNote,
      },
    });

    return rejectedSuggestion;
  }

  // Vorschlag löschen (nur eigene)
  async deleteFamilySuggestion(user: any, suggestionId: string) {
    const suggestion = await this.prisma.partnerFamilySuggestion.findUnique({
      where: { id: suggestionId },
    });

    if (!suggestion) {
      throw new NotFoundException('Vorschlag nicht gefunden');
    }

    // Nur eigene Vorschläge oder als Manager
    const canManage = await this.canManagePartners(user);
    if (suggestion.createdById !== user.id && !canManage) {
      throw new ForbiddenException('Keine Berechtigung');
    }

    // Nur PENDING Vorschläge können gelöscht werden
    if (suggestion.suggestionStatus !== SuggestionStatus.PENDING) {
      throw new BadRequestException('Nur ausstehende Vorschläge können gelöscht werden');
    }

    await this.prisma.partnerFamilySuggestion.delete({
      where: { id: suggestionId },
    });

    // Audit Log
    await this.auditService.log({
      userId: user.id,
      action: 'PARTNER_SUGGESTION_DELETED',
      entity: 'PartnerFamilySuggestion',
      entityId: suggestionId,
      meta: {
        type: suggestion.type,
        familyName: suggestion.familyName,
      },
    });

    return { success: true };
  }

  // ============ PARTNER ACCESS VALIDATION ============

  // Prüfe ob ein Partner-User Zugang hat
  async validatePartnerAccess(discordId: string): Promise<{ hasAccess: boolean; user?: any; reason?: string }> {
    // Prüfe ob genehmigte Anfrage existiert
    const request = await this.prisma.partnerAccessRequest.findUnique({
      where: { discordId },
    });

    if (!request) {
      return { hasAccess: false, reason: 'Keine Partner-Zugangsanfrage gefunden' };
    }

    if (request.status === PartnerAccessStatus.PENDING) {
      return { hasAccess: false, reason: 'Partner-Zugangsanfrage ist noch ausstehend' };
    }

    if (request.status === PartnerAccessStatus.REJECTED) {
      return { hasAccess: false, reason: 'Partner-Zugangsanfrage wurde abgelehnt' };
    }

    // Hole Partner-User
    const user = await this.prisma.user.findUnique({
      where: { discordId },
    });

    if (!user || !user.isPartner) {
      return { hasAccess: false, reason: 'Partner-User nicht gefunden' };
    }

    return { hasAccess: true, user };
  }

  // Familienkontakte für Partner (eingeschränkte Ansicht)
  async getFamilyContactsForPartner(user: any) {
    if (!user.isPartner) {
      throw new ForbiddenException('Nur für Partner');
    }

    // Partner sehen nur eingeschränkte Daten
    return this.prisma.familyContact.findMany({
      select: {
        id: true,
        familyName: true,
        status: true,
        propertyZip: true,
        isKeyFamily: true,
        isOutdated: true,
        // KEINE Kontaktdaten!
        mapAnnotations: {
          select: {
            id: true,
            mapName: true,
            x: true,
            y: true,
            icon: true,
            label: true,
          },
        },
      },
      orderBy: { familyName: 'asc' },
    });
  }

  // Map-Annotationen für Partner (nur lesen)
  async getMapAnnotationsForPartner(user: any, mapName?: string) {
    if (!user.isPartner) {
      throw new ForbiddenException('Nur für Partner');
    }

    const where = mapName ? { mapName: mapName as any } : {};

    return this.prisma.mapAnnotation.findMany({
      where,
      select: {
        id: true,
        mapName: true,
        x: true,
        y: true,
        icon: true,
        label: true,
        familyContact: {
          select: {
            id: true,
            familyName: true,
            status: true,
            // KEINE Kontaktdaten!
          },
        },
      },
    });
  }

  // Prüfe ob User Partner-Verwaltungsberechtigung hat
  async hasPartnerManagementPermission(userId: string): Promise<boolean> {
    const permission = await this.prisma.partnerManagementPermission.findUnique({
      where: { userId },
    });
    return !!permission;
  }
}

