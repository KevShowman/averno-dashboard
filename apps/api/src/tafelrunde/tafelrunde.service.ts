import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { DiscordService } from '../discord/discord.service';
import { Role, TafelrundeStatus, TafelrundeAttendance } from '@prisma/client';

const LEADERSHIP_ROLES: Role[] = [
  Role.PATRON,
  Role.DON,
  Role.CAPO,
  Role.ADMIN,
];

@Injectable()
export class TafelrundeService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private discordService: DiscordService,
  ) {}

  // ============ HELPER METHODS ============

  private isLeadership(user: any): boolean {
    return LEADERSHIP_ROLES.includes(user.role);
  }

  private async canManageTafelrunde(user: any): Promise<boolean> {
    if (this.isLeadership(user)) return true;
    
    const permission = await this.prisma.tafelrundePermission.findUnique({
      where: { userId: user.id },
    });
    return !!permission;
  }

  private async canUpdateAttendance(user: any): Promise<boolean> {
    // Leadership, berechtigte User und Partner können Anwesenheit aktualisieren
    if (this.isLeadership(user)) return true;
    if (user.isPartner) return true;
    
    const permission = await this.prisma.tafelrundePermission.findUnique({
      where: { userId: user.id },
    });
    return !!permission;
  }

  // ============ TAFELRUNDE CRUD ============

  // Alle Tafelrunden abrufen
  async getAllTafelrunden(user: any) {
    const canManage = await this.canManageTafelrunde(user);
    const canUpdate = await this.canUpdateAttendance(user);
    
    if (!canManage && !canUpdate) {
      throw new ForbiddenException('Keine Berechtigung');
    }

    return this.prisma.tafelrunde.findMany({
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            icFirstName: true,
            icLastName: true,
          },
        },
        families: {
          include: {
            familyContact: {
              select: {
                id: true,
                familyName: true,
                status: true,
                propertyZip: true,
              },
            },
            updatedBy: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
        _count: {
          select: {
            families: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  // Einzelne Tafelrunde abrufen
  async getTafelrundeById(user: any, id: string) {
    const canUpdate = await this.canUpdateAttendance(user);
    
    if (!canUpdate) {
      throw new ForbiddenException('Keine Berechtigung');
    }

    const tafelrunde = await this.prisma.tafelrunde.findUnique({
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
        families: {
          include: {
            familyContact: {
              select: {
                id: true,
                familyName: true,
                status: true,
                propertyZip: true,
              },
            },
            updatedBy: {
              select: {
                id: true,
                username: true,
              },
            },
          },
          orderBy: {
            familyContact: {
              familyName: 'asc',
            },
          },
        },
      },
    });

    if (!tafelrunde) {
      throw new NotFoundException('Tafelrunde nicht gefunden');
    }

    return tafelrunde;
  }

  // Tafelrunde erstellen
  async createTafelrunde(user: any, data: {
    title: string;
    description?: string;
    date: Date;
    location?: string;
    meetingPointMapName: string;
    meetingPointX: number;
    meetingPointY: number;
    pickupStartTime?: string;
    arrivalDeadline?: string;
  }) {
    const canManage = await this.canManageTafelrunde(user);
    
    if (!canManage) {
      throw new ForbiddenException('Keine Berechtigung zum Erstellen von Tafelrunden');
    }

    if (!data.title || !data.date) {
      throw new BadRequestException('Titel und Datum sind erforderlich');
    }

    if (!data.meetingPointMapName || data.meetingPointX == null || data.meetingPointY == null) {
      throw new BadRequestException('Treffpunkt auf der Karte ist erforderlich');
    }

    const tafelrunde = await this.prisma.tafelrunde.create({
      data: {
        title: data.title,
        description: data.description,
        date: new Date(data.date),
        location: data.location,
        meetingPointMapName: data.meetingPointMapName,
        meetingPointX: data.meetingPointX,
        meetingPointY: data.meetingPointY,
        pickupStartTime: data.pickupStartTime,
        arrivalDeadline: data.arrivalDeadline,
        createdById: user.id,
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

    await this.auditService.log({
      userId: user.id,
      action: 'TAFELRUNDE_CREATED',
      entity: 'Tafelrunde',
      entityId: tafelrunde.id,
      meta: { title: data.title, date: data.date },
    });

    // Discord Webhook
    const dateObj = new Date(data.date);
    const timeStr = dateObj.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    await this.discordService.sendTafelrundeCreatedNotification(
      data.title,
      dateObj,
      timeStr,
      user.icFirstName || user.username,
      0, // Familien werden später hinzugefügt
    );

    return tafelrunde;
  }

  // Tafelrunde aktualisieren
  async updateTafelrunde(user: any, id: string, data: {
    title?: string;
    description?: string;
    date?: Date;
    location?: string;
    meetingPointMapName?: string;
    meetingPointX?: number;
    meetingPointY?: number;
    pickupStartTime?: string;
    arrivalDeadline?: string;
    status?: TafelrundeStatus;
  }) {
    const canManage = await this.canManageTafelrunde(user);
    
    if (!canManage) {
      throw new ForbiddenException('Keine Berechtigung');
    }

    const existing = await this.prisma.tafelrunde.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Tafelrunde nicht gefunden');
    }

    const tafelrunde = await this.prisma.tafelrunde.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        date: data.date ? new Date(data.date) : undefined,
        location: data.location,
        meetingPointMapName: data.meetingPointMapName,
        meetingPointX: data.meetingPointX,
        meetingPointY: data.meetingPointY,
        pickupStartTime: data.pickupStartTime,
        arrivalDeadline: data.arrivalDeadline,
        status: data.status,
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

    await this.auditService.log({
      userId: user.id,
      action: 'TAFELRUNDE_UPDATED',
      entity: 'Tafelrunde',
      entityId: id,
      meta: { title: tafelrunde.title, changes: data },
    });

    return tafelrunde;
  }

  // Tafelrunde löschen
  async deleteTafelrunde(user: any, id: string) {
    const canManage = await this.canManageTafelrunde(user);
    
    if (!canManage) {
      throw new ForbiddenException('Keine Berechtigung');
    }

    const existing = await this.prisma.tafelrunde.findUnique({
      where: { id },
      select: { title: true },
    });

    if (!existing) {
      throw new NotFoundException('Tafelrunde nicht gefunden');
    }

    await this.prisma.tafelrunde.delete({
      where: { id },
    });

    await this.auditService.log({
      userId: user.id,
      action: 'TAFELRUNDE_DELETED',
      entity: 'Tafelrunde',
      entityId: id,
      meta: { title: existing.title },
    });

    return { message: 'Tafelrunde gelöscht' };
  }

  // ============ FAMILIEN MANAGEMENT ============

  // Familie zu Tafelrunde hinzufügen
  async addFamilyToTafelrunde(user: any, tafelrundeId: string, familyContactId: string) {
    const canManage = await this.canManageTafelrunde(user);
    
    if (!canManage) {
      throw new ForbiddenException('Keine Berechtigung');
    }

    // Prüfe ob Tafelrunde existiert
    const tafelrunde = await this.prisma.tafelrunde.findUnique({
      where: { id: tafelrundeId },
    });

    if (!tafelrunde) {
      throw new NotFoundException('Tafelrunde nicht gefunden');
    }

    // Prüfe ob Familie existiert
    const family = await this.prisma.familyContact.findUnique({
      where: { id: familyContactId },
    });

    if (!family) {
      throw new NotFoundException('Familie nicht gefunden');
    }

    // Prüfe ob bereits hinzugefügt
    const existing = await this.prisma.tafelrundeFamily.findUnique({
      where: {
        tafelrundeId_familyContactId: {
          tafelrundeId,
          familyContactId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Familie ist bereits zur Tafelrunde hinzugefügt');
    }

    const tafelrundeFamily = await this.prisma.tafelrundeFamily.create({
      data: {
        tafelrundeId,
        familyContactId,
      },
      include: {
        familyContact: {
          select: {
            id: true,
            familyName: true,
            status: true,
          },
        },
      },
    });

    await this.auditService.log({
      userId: user.id,
      action: 'TAFELRUNDE_FAMILY_ADDED',
      entity: 'TafelrundeFamily',
      entityId: tafelrundeFamily.id,
      meta: { tafelrundeId, familyName: family.familyName },
    });

    return tafelrundeFamily;
  }

  // Mehrere Familien zu Tafelrunde hinzufügen
  async addFamiliesToTafelrunde(user: any, tafelrundeId: string, familyContactIds: string[]) {
    const canManage = await this.canManageTafelrunde(user);
    
    if (!canManage) {
      throw new ForbiddenException('Keine Berechtigung');
    }

    const tafelrunde = await this.prisma.tafelrunde.findUnique({
      where: { id: tafelrundeId },
    });

    if (!tafelrunde) {
      throw new NotFoundException('Tafelrunde nicht gefunden');
    }

    // Füge alle Familien hinzu (ignoriere bereits existierende)
    const results = await Promise.all(
      familyContactIds.map(async (familyContactId) => {
        try {
          return await this.prisma.tafelrundeFamily.create({
            data: {
              tafelrundeId,
              familyContactId,
            },
            include: {
              familyContact: {
                select: {
                  id: true,
                  familyName: true,
                },
              },
            },
          });
        } catch (error) {
          // Ignoriere Duplikate
          return null;
        }
      })
    );

    const added = results.filter(Boolean);

    await this.auditService.log({
      userId: user.id,
      action: 'TAFELRUNDE_FAMILIES_ADDED',
      entity: 'Tafelrunde',
      entityId: tafelrundeId,
      meta: { count: added.length },
    });

    return { added: added.length };
  }

  // Familie von Tafelrunde entfernen
  async removeFamilyFromTafelrunde(user: any, tafelrundeId: string, familyContactId: string) {
    const canManage = await this.canManageTafelrunde(user);
    
    if (!canManage) {
      throw new ForbiddenException('Keine Berechtigung');
    }

    const tafelrundeFamily = await this.prisma.tafelrundeFamily.findUnique({
      where: {
        tafelrundeId_familyContactId: {
          tafelrundeId,
          familyContactId,
        },
      },
      include: {
        familyContact: {
          select: { familyName: true },
        },
      },
    });

    if (!tafelrundeFamily) {
      throw new NotFoundException('Familie ist nicht zur Tafelrunde eingeladen');
    }

    await this.prisma.tafelrundeFamily.delete({
      where: { id: tafelrundeFamily.id },
    });

    await this.auditService.log({
      userId: user.id,
      action: 'TAFELRUNDE_FAMILY_REMOVED',
      entity: 'TafelrundeFamily',
      entityId: tafelrundeFamily.id,
      meta: { tafelrundeId, familyName: tafelrundeFamily.familyContact.familyName },
    });

    return { message: 'Familie entfernt' };
  }

  // ============ ANWESENHEIT AKTUALISIEREN ============

  // Anwesenheitsstatus einer Familie aktualisieren (auch für Partner)
  async updateFamilyAttendance(user: any, tafelrundeId: string, familyContactId: string, data: {
    attendanceStatus: TafelrundeAttendance;
    note?: string;
  }) {
    const canUpdate = await this.canUpdateAttendance(user);
    
    if (!canUpdate) {
      throw new ForbiddenException('Keine Berechtigung zum Aktualisieren der Anwesenheit');
    }

    const tafelrundeFamily = await this.prisma.tafelrundeFamily.findUnique({
      where: {
        tafelrundeId_familyContactId: {
          tafelrundeId,
          familyContactId,
        },
      },
      include: {
        tafelrunde: {
          select: { title: true },
        },
        familyContact: {
          select: { familyName: true },
        },
      },
    });

    if (!tafelrundeFamily) {
      throw new NotFoundException('Familie ist nicht zur Tafelrunde eingeladen');
    }

    const updated = await this.prisma.tafelrundeFamily.update({
      where: { id: tafelrundeFamily.id },
      data: {
        attendanceStatus: data.attendanceStatus,
        note: data.note,
        updatedById: user.id,
      },
      include: {
        familyContact: {
          select: {
            id: true,
            familyName: true,
            status: true,
          },
        },
        updatedBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    await this.auditService.log({
      userId: user.id,
      action: 'TAFELRUNDE_ATTENDANCE_UPDATED',
      entity: 'TafelrundeFamily',
      entityId: tafelrundeFamily.id,
      meta: { 
        tafelrundeId, 
        familyName: tafelrundeFamily.familyContact.familyName,
        newStatus: data.attendanceStatus,
        isPartner: user.isPartner,
      },
    });

    // Discord Webhook
    await this.discordService.sendTafelrundeAttendanceNotification(
      tafelrundeFamily.tafelrunde.title,
      tafelrundeFamily.familyContact.familyName,
      data.attendanceStatus,
      user.icFirstName || user.username,
    );

    return updated;
  }

  // ============ BERECHTIGUNGEN ============

  // Alle Berechtigungen abrufen
  async getAllPermissions(user: any) {
    if (!this.isLeadership(user)) {
      throw new ForbiddenException('Nur Leadership kann Berechtigungen verwalten');
    }

    return this.prisma.tafelrundePermission.findMany({
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
    });
  }

  // Berechtigung erteilen
  async grantPermission(user: any, targetUserId: string) {
    if (!this.isLeadership(user)) {
      throw new ForbiddenException('Nur Leadership kann Berechtigungen vergeben');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { username: true },
    });

    if (!targetUser) {
      throw new NotFoundException('Benutzer nicht gefunden');
    }

    const existing = await this.prisma.tafelrundePermission.findUnique({
      where: { userId: targetUserId },
    });

    if (existing) {
      throw new BadRequestException('Benutzer hat bereits die Berechtigung');
    }

    const permission = await this.prisma.tafelrundePermission.create({
      data: {
        userId: targetUserId,
        grantedById: user.id,
      },
    });

    await this.auditService.log({
      userId: user.id,
      action: 'TAFELRUNDE_PERMISSION_GRANTED',
      entity: 'TafelrundePermission',
      entityId: permission.id,
      meta: { targetUserId, targetUsername: targetUser.username },
    });

    return permission;
  }

  // Berechtigung entziehen
  async revokePermission(user: any, targetUserId: string) {
    if (!this.isLeadership(user)) {
      throw new ForbiddenException('Nur Leadership kann Berechtigungen entziehen');
    }

    const permission = await this.prisma.tafelrundePermission.findUnique({
      where: { userId: targetUserId },
    });

    if (!permission) {
      throw new NotFoundException('Berechtigung nicht gefunden');
    }

    await this.prisma.tafelrundePermission.delete({
      where: { id: permission.id },
    });

    await this.auditService.log({
      userId: user.id,
      action: 'TAFELRUNDE_PERMISSION_REVOKED',
      entity: 'TafelrundePermission',
      entityId: permission.id,
      meta: { targetUserId },
    });

    return { message: 'Berechtigung entzogen' };
  }

  // Prüfen ob User Berechtigung hat
  async checkPermission(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return false;
    if (this.isLeadership(user)) return true;

    const permission = await this.prisma.tafelrundePermission.findUnique({
      where: { userId },
    });
    return !!permission;
  }

  // ============ STATISTIKEN ============

  // Zusammenfassung für eine Tafelrunde
  async getTafelrundeSummary(user: any, id: string) {
    const canUpdate = await this.canUpdateAttendance(user);
    
    if (!canUpdate) {
      throw new ForbiddenException('Keine Berechtigung');
    }

    const tafelrunde = await this.prisma.tafelrunde.findUnique({
      where: { id },
      include: {
        families: {
          select: {
            attendanceStatus: true,
          },
        },
      },
    });

    if (!tafelrunde) {
      throw new NotFoundException('Tafelrunde nicht gefunden');
    }

    const summary = {
      total: tafelrunde.families.length,
      attending: tafelrunde.families.filter(f => f.attendanceStatus === 'ATTENDING').length,
      notAttending: tafelrunde.families.filter(f => f.attendanceStatus === 'NOT_ATTENDING').length,
      maybe: tafelrunde.families.filter(f => f.attendanceStatus === 'MAYBE').length,
      unknown: tafelrunde.families.filter(f => f.attendanceStatus === 'UNKNOWN').length,
    };

    return summary;
  }
}

