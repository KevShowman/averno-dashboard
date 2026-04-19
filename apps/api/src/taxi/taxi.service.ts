import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';
import { DiscordService } from '../discord/discord.service';
import { TaxiKeyStatus, TaxiKeyType, TaxiAssignmentStatus, TafelrundeAttendance } from '@prisma/client';
import { randomBytes } from 'crypto';

// Rollen die Taxi-Keys erstellen dürfen
const KEY_CREATOR_ROLES = ['PATRON', 'DON', 'CAPO'];

// Spezielle User die Keys erstellen dürfen (z.B. "Olaf")
const SPECIAL_KEY_CREATORS: string[] = []; // Hier Discord-IDs eintragen wenn nötig

@Injectable()
export class TaxiService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    @Inject(forwardRef(() => AuthService))
    private authService: AuthService,
    private discordService: DiscordService,
  ) {}

  // ============ KEY MANAGEMENT ============

  /**
   * Prüft ob ein User Taxi-Keys erstellen darf
   */
  async canCreateKeys(user: any): Promise<boolean> {
    if (!user) return false;
    
    // Leadership kann Keys erstellen
    if (KEY_CREATOR_ROLES.includes(user.role)) return true;
    
    // Taxi-Leitung kann Keys erstellen
    if (user.isTaxiLead) return true;
    
    // Spezielle User (z.B. Olaf)
    if (SPECIAL_KEY_CREATORS.includes(user.discordId)) return true;
    
    return false;
  }

  /**
   * Generiert einen neuen Taxi-Key
   */
  async generateKey(
    user: any,
    data: {
      isMasterKey?: boolean;
      type?: TaxiKeyType;
      expiresAt?: Date;
      note?: string;
    },
  ) {
    if (!(await this.canCreateKeys(user))) {
      throw new ForbiddenException('Keine Berechtigung zum Erstellen von Taxi-Keys');
    }

    // Master Keys können nur von Leadership oder Taxi-Leitung erstellt werden
    if (data.isMasterKey && !KEY_CREATOR_ROLES.includes(user.role) && !user.isTaxiLead) {
      throw new ForbiddenException('Master Keys können nur von Leadership oder Taxi-Leitung erstellt werden');
    }

    // Generiere zufälligen Key (12 Zeichen, alphanumerisch)
    const keyValue = this.generateRandomKey();

    const taxiKey = await this.prisma.taxiKey.create({
      data: {
        key: keyValue,
        type: data.type || TaxiKeyType.SINGLE_USE,
        isMasterKey: data.isMasterKey || false,
        expiresAt: data.expiresAt,
        note: data.note,
        createdById: user.id,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            icFirstName: true,
          },
        },
      },
    });

    await this.auditService.log({
      userId: user.id,
      action: 'TAXI_KEY_CREATED',
      entity: 'TaxiKey',
      entityId: taxiKey.id,
      meta: {
        isMasterKey: data.isMasterKey,
        type: data.type,
        note: data.note,
      },
    });

    // Discord Webhook
    await this.discordService.sendTaxiKeyCreatedNotification(
      user.icFirstName || user.username,
      data.type || 'SINGLE_USE',
      data.isMasterKey || false,
      data.note,
    );

    return taxiKey;
  }

  /**
   * Generiert einen zufälligen Key
   */
  private generateRandomKey(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Keine O, 0, I, 1 für bessere Lesbarkeit
    let key = '';
    const bytes = randomBytes(12);
    for (let i = 0; i < 12; i++) {
      key += chars[bytes[i] % chars.length];
    }
    // Format: XXXX-XXXX-XXXX
    return `${key.slice(0, 4)}-${key.slice(4, 8)}-${key.slice(8, 12)}`;
  }

  /**
   * Validiert und verwendet einen Taxi-Key
   */
  async validateAndUseKey(
    user: any,
    keyValue: string,
  ): Promise<{ valid: boolean; isMasterKey: boolean; message?: string }> {
    // Bereinige Key-Eingabe (entferne Leerzeichen, mache uppercase)
    const cleanKey = keyValue.replace(/\s/g, '').toUpperCase();

    const taxiKey = await this.prisma.taxiKey.findUnique({
      where: { key: cleanKey },
    });

    if (!taxiKey) {
      return { valid: false, isMasterKey: false, message: 'Ungültiger Zugangsschlüssel' };
    }

    // Prüfe Status
    if (taxiKey.status === TaxiKeyStatus.USED) {
      return { valid: false, isMasterKey: false, message: 'Dieser Schlüssel wurde bereits verwendet' };
    }

    if (taxiKey.status === TaxiKeyStatus.REVOKED) {
      return { valid: false, isMasterKey: false, message: 'Dieser Schlüssel wurde widerrufen' };
    }

    if (taxiKey.status === TaxiKeyStatus.EXPIRED) {
      return { valid: false, isMasterKey: false, message: 'Dieser Schlüssel ist abgelaufen' };
    }

    // Prüfe Ablaufdatum
    if (taxiKey.expiresAt && new Date() > taxiKey.expiresAt) {
      await this.prisma.taxiKey.update({
        where: { id: taxiKey.id },
        data: { status: TaxiKeyStatus.EXPIRED },
      });
      return { valid: false, isMasterKey: false, message: 'Dieser Schlüssel ist abgelaufen' };
    }

    // Key ist gültig - User als Taxi markieren
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isTaxi: true,
        isTaxiLead: taxiKey.isMasterKey,
        role: taxiKey.isMasterKey ? 'TAXI_LEAD' : 'TAXI',
      },
    });

    // Bei Single-Use Key: Status auf USED setzen
    if (taxiKey.type === TaxiKeyType.SINGLE_USE) {
      await this.prisma.taxiKey.update({
        where: { id: taxiKey.id },
        data: {
          status: TaxiKeyStatus.USED,
          usedById: user.id,
          usedAt: new Date(),
        },
      });
    } else {
      // Bei anderen Keys: Nur usedBy/usedAt aktualisieren
      await this.prisma.taxiKey.update({
        where: { id: taxiKey.id },
        data: {
          usedById: user.id,
          usedAt: new Date(),
        },
      });
    }

    await this.auditService.log({
      userId: user.id,
      action: 'TAXI_KEY_USED',
      entity: 'TaxiKey',
      entityId: taxiKey.id,
      meta: {
        isMasterKey: taxiKey.isMasterKey,
        keyType: taxiKey.type,
      },
    });

    return {
      valid: true,
      isMasterKey: taxiKey.isMasterKey,
    };
  }

  /**
   * Validiert einen Key und erstellt einen neuen Taxi-User (öffentlicher Endpoint)
   * WICHTIG: Dies ist der sichere Weg für neue Taxi-Logins
   */
  async validateAndCreateTaxiUser(
    keyValue: string,
    discordData: {
      discordId: string;
      username: string;
      avatarUrl?: string;
      email?: string;
    },
  ): Promise<{ 
    valid: boolean; 
    isMasterKey: boolean; 
    message?: string;
    accessToken?: string;
    refreshToken?: string;
  }> {
    // Bereinige Key-Eingabe
    const cleanKey = keyValue.replace(/\s/g, '').toUpperCase();

    const taxiKey = await this.prisma.taxiKey.findUnique({
      where: { key: cleanKey },
    });

    if (!taxiKey) {
      return { valid: false, isMasterKey: false, message: 'Ungültiger Zugangsschlüssel' };
    }

    // Prüfe Status
    if (taxiKey.status === TaxiKeyStatus.USED) {
      return { valid: false, isMasterKey: false, message: 'Dieser Schlüssel wurde bereits verwendet' };
    }

    if (taxiKey.status === TaxiKeyStatus.REVOKED) {
      return { valid: false, isMasterKey: false, message: 'Dieser Schlüssel wurde widerrufen' };
    }

    if (taxiKey.status === TaxiKeyStatus.EXPIRED) {
      return { valid: false, isMasterKey: false, message: 'Dieser Schlüssel ist abgelaufen' };
    }

    // Prüfe Ablaufdatum
    if (taxiKey.expiresAt && new Date() > taxiKey.expiresAt) {
      await this.prisma.taxiKey.update({
        where: { id: taxiKey.id },
        data: { status: TaxiKeyStatus.EXPIRED },
      });
      return { valid: false, isMasterKey: false, message: 'Dieser Schlüssel ist abgelaufen' };
    }

    // Key ist gültig - User erstellen oder aktualisieren
    let user = await this.prisma.user.findUnique({
      where: { discordId: discordData.discordId },
    });

    if (!user) {
      // Neuen User erstellen mit Taxi-Rolle
      user = await this.prisma.user.create({
        data: {
          discordId: discordData.discordId,
          username: discordData.username,
          avatarUrl: discordData.avatarUrl,
          email: discordData.email,
          role: taxiKey.isMasterKey ? 'TAXI_LEAD' : 'TAXI',
          isTaxi: true,
          isTaxiLead: taxiKey.isMasterKey,
        },
      });
    } else {
      // Bestehenden User als Taxi markieren
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          isTaxi: true,
          isTaxiLead: taxiKey.isMasterKey,
          role: taxiKey.isMasterKey ? 'TAXI_LEAD' : 'TAXI',
        },
      });
    }

    // Bei Single-Use Key: Status auf USED setzen
    if (taxiKey.type === TaxiKeyType.SINGLE_USE) {
      await this.prisma.taxiKey.update({
        where: { id: taxiKey.id },
        data: {
          status: TaxiKeyStatus.USED,
          usedById: user.id,
          usedAt: new Date(),
        },
      });
    } else {
      await this.prisma.taxiKey.update({
        where: { id: taxiKey.id },
        data: {
          usedById: user.id,
          usedAt: new Date(),
        },
      });
    }

    await this.auditService.log({
      userId: user.id,
      action: 'TAXI_KEY_USED',
      entity: 'TaxiKey',
      entityId: taxiKey.id,
      meta: {
        isMasterKey: taxiKey.isMasterKey,
        keyType: taxiKey.type,
        newUser: !user,
      },
    });

    // Discord Webhook - Neuer Taxi-Fahrer registriert
    await this.discordService.sendTaxiDriverRegisteredNotification(
      discordData.username,
      taxiKey.isMasterKey,
    );

    // Tokens generieren
    const tokens = await this.authService.generateTokens(user);

    return {
      valid: true,
      isMasterKey: taxiKey.isMasterKey,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Listet alle Taxi-Keys auf (für Management)
   */
  async getAllKeys(user: any) {
    if (!(await this.canCreateKeys(user))) {
      throw new ForbiddenException('Keine Berechtigung');
    }

    return this.prisma.taxiKey.findMany({
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            icFirstName: true,
          },
        },
        usedBy: {
          select: {
            id: true,
            username: true,
            icFirstName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Widerruft einen Taxi-Key
   */
  async revokeKey(user: any, keyId: string) {
    if (!(await this.canCreateKeys(user))) {
      throw new ForbiddenException('Keine Berechtigung');
    }

    const taxiKey = await this.prisma.taxiKey.findUnique({
      where: { id: keyId },
    });

    if (!taxiKey) {
      throw new NotFoundException('Key nicht gefunden');
    }

    const updated = await this.prisma.taxiKey.update({
      where: { id: keyId },
      data: { status: TaxiKeyStatus.REVOKED },
    });

    await this.auditService.log({
      userId: user.id,
      action: 'TAXI_KEY_REVOKED',
      entity: 'TaxiKey',
      entityId: keyId,
      meta: {},
    });

    return updated;
  }

  // ============ TAXI ASSIGNMENTS ============

  /**
   * Prüft ob User Taxi-Zuweisungen verwalten kann (Taxi-Leitung)
   */
  async canManageAssignments(user: any): Promise<boolean> {
    if (!user) return false;
    return user.isTaxiLead || KEY_CREATOR_ROLES.includes(user.role);
  }

  /**
   * Holt alle zugesagten Familien einer Tafelrunde für Taxi
   */
  async getAttendingFamiliesForTafelrunde(user: any, tafelrundeId: string) {
    // Taxi-User oder Leadership dürfen zugreifen
    if (!user.isTaxi && !user.isTaxiLead && !KEY_CREATOR_ROLES.includes(user.role)) {
      throw new ForbiddenException('Kein Zugriff auf Taxi-Daten');
    }

    const tafelrunde = await this.prisma.tafelrunde.findUnique({
      where: { id: tafelrundeId },
      include: {
        families: {
          where: {
            attendanceStatus: TafelrundeAttendance.ATTENDING,
          },
          include: {
            familyContact: {
              include: {
                mapAnnotations: {
                  select: {
                    id: true,
                    mapName: true,
                    x: true,
                    y: true,
                    icon: true,
                  },
                },
              },
            },
          },
        },
        taxiAssignments: {
          include: {
            driver: {
              select: {
                id: true,
                username: true,
                icFirstName: true,
              },
            },
            familyContact: true,
          },
        },
      },
    });

    if (!tafelrunde) {
      throw new NotFoundException('Tafelrunde nicht gefunden');
    }

    return tafelrunde;
  }

  /**
   * Erstellt oder aktualisiert eine Taxi-Zuweisung
   */
  async assignDriver(
    user: any,
    data: {
      tafelrundeId: string;
      familyContactId: string;
      driverId?: string;
      pickupNotes?: string;
      pickupTime?: string;
    },
  ) {
    if (!(await this.canManageAssignments(user))) {
      throw new ForbiddenException('Keine Berechtigung für Taxi-Zuweisungen');
    }

    // Prüfe ob Tafelrunde existiert
    const tafelrunde = await this.prisma.tafelrunde.findUnique({
      where: { id: data.tafelrundeId },
    });

    if (!tafelrunde) {
      throw new NotFoundException('Tafelrunde nicht gefunden');
    }

    // Prüfe ob Familie existiert und zugesagt hat
    const tafelrundeFamily = await this.prisma.tafelrundeFamily.findUnique({
      where: {
        tafelrundeId_familyContactId: {
          tafelrundeId: data.tafelrundeId,
          familyContactId: data.familyContactId,
        },
      },
    });

    if (!tafelrundeFamily || tafelrundeFamily.attendanceStatus !== TafelrundeAttendance.ATTENDING) {
      throw new BadRequestException('Familie hat nicht zugesagt oder ist nicht eingeladen');
    }

    // Prüfe ob Fahrer existiert und Taxi ist
    if (data.driverId) {
      const driver = await this.prisma.user.findUnique({
        where: { id: data.driverId },
      });

      if (!driver || !driver.isTaxi) {
        throw new BadRequestException('Ungültiger Fahrer');
      }
    }

    // Upsert: Erstelle oder aktualisiere Zuweisung
    const assignment = await this.prisma.taxiAssignment.upsert({
      where: {
        tafelrundeId_familyContactId: {
          tafelrundeId: data.tafelrundeId,
          familyContactId: data.familyContactId,
        },
      },
      create: {
        tafelrundeId: data.tafelrundeId,
        familyContactId: data.familyContactId,
        driverId: data.driverId,
        pickupNotes: data.pickupNotes,
        pickupTime: data.pickupTime,
        status: data.driverId ? TaxiAssignmentStatus.ASSIGNED : TaxiAssignmentStatus.PENDING,
        createdById: user.id,
      },
      update: {
        driverId: data.driverId,
        pickupNotes: data.pickupNotes,
        pickupTime: data.pickupTime,
        status: data.driverId ? TaxiAssignmentStatus.ASSIGNED : TaxiAssignmentStatus.PENDING,
      },
      include: {
        driver: {
          select: {
            id: true,
            username: true,
            icFirstName: true,
          },
        },
        familyContact: true,
      },
    });

    await this.auditService.log({
      userId: user.id,
      action: 'TAXI_ASSIGNMENT_UPDATED',
      entity: 'TaxiAssignment',
      entityId: assignment.id,
      meta: {
        tafelrundeId: data.tafelrundeId,
        familyContactId: data.familyContactId,
        driverId: data.driverId,
      },
    });

    // Discord Webhook - nur wenn ein Fahrer zugewiesen wurde
    if (data.driverId && assignment.driver) {
      await this.discordService.sendTaxiAssignmentNotification(
        assignment.familyContact?.familyName || 'Unbekannt',
        assignment.driver.icFirstName || assignment.driver.username,
        tafelrunde.title,
        user.icFirstName || user.username,
      );
    }

    return assignment;
  }

  /**
   * Aktualisiert den Status einer Taxi-Zuweisung (für Fahrer und Leitung)
   */
  async updateAssignmentStatus(
    user: any,
    assignmentId: string,
    status: TaxiAssignmentStatus,
  ) {
    const assignment = await this.prisma.taxiAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        driver: { select: { username: true, icFirstName: true } },
        familyContact: { select: { familyName: true } },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Zuweisung nicht gefunden');
    }

    // Taxi-Leitung kann immer den Status ändern, Fahrer nur für ihre eigenen
    const isLead = user.isTaxiLead || KEY_CREATOR_ROLES.includes(user.role);
    if (!isLead && assignment.driverId !== user.id) {
      throw new ForbiddenException('Keine Berechtigung');
    }

    const oldStatus = assignment.status;

    const updated = await this.prisma.taxiAssignment.update({
      where: { id: assignmentId },
      data: {
        status,
        completedAt: status === TaxiAssignmentStatus.DELIVERED ? new Date() : undefined,
      },
      include: {
        driver: {
          select: {
            id: true,
            username: true,
            icFirstName: true,
          },
        },
        familyContact: true,
      },
    });

    await this.auditService.log({
      userId: user.id,
      action: 'TAXI_ASSIGNMENT_STATUS_CHANGED',
      entity: 'TaxiAssignment',
      entityId: assignmentId,
      meta: { oldStatus, newStatus: status },
    });

    // Discord Webhook - Status geändert
    await this.discordService.sendTaxiStatusChangeNotification(
      assignment.familyContact?.familyName || 'Unbekannt',
      assignment.driver?.icFirstName || assignment.driver?.username || 'Unbekannt',
      oldStatus,
      status,
    );

    return updated;
  }

  /**
   * Bearbeitet eine bestehende Taxi-Zuweisung (Leitung)
   */
  async updateAssignment(
    user: any,
    assignmentId: string,
    data: {
      driverId?: string | null;
      pickupNotes?: string;
      pickupTime?: string;
    },
  ) {
    if (!(await this.canManageAssignments(user))) {
      throw new ForbiddenException('Keine Berechtigung für Taxi-Zuweisungen');
    }

    const assignment = await this.prisma.taxiAssignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new NotFoundException('Zuweisung nicht gefunden');
    }

    // Wenn Fahrer geändert wird, prüfe ob neuer Fahrer gültig
    if (data.driverId) {
      const driver = await this.prisma.user.findUnique({
        where: { id: data.driverId },
      });

      if (!driver || !driver.isTaxi) {
        throw new BadRequestException('Ungültiger Fahrer');
      }
    }

    const updated = await this.prisma.taxiAssignment.update({
      where: { id: assignmentId },
      data: {
        driverId: data.driverId === null ? null : data.driverId,
        pickupNotes: data.pickupNotes,
        pickupTime: data.pickupTime,
        status: data.driverId ? TaxiAssignmentStatus.ASSIGNED : TaxiAssignmentStatus.PENDING,
      },
      include: {
        driver: {
          select: {
            id: true,
            username: true,
            icFirstName: true,
          },
        },
        familyContact: true,
      },
    });

    await this.auditService.log({
      userId: user.id,
      action: 'TAXI_ASSIGNMENT_EDITED',
      entity: 'TaxiAssignment',
      entityId: assignmentId,
      meta: data,
    });

    return updated;
  }

  /**
   * Entfernt eine Taxi-Zuweisung (Leitung)
   */
  async removeAssignment(user: any, assignmentId: string) {
    if (!(await this.canManageAssignments(user))) {
      throw new ForbiddenException('Keine Berechtigung für Taxi-Zuweisungen');
    }

    const assignment = await this.prisma.taxiAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        familyContact: { select: { familyName: true } },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Zuweisung nicht gefunden');
    }

    await this.prisma.taxiAssignment.delete({
      where: { id: assignmentId },
    });

    await this.auditService.log({
      userId: user.id,
      action: 'TAXI_ASSIGNMENT_REMOVED',
      entity: 'TaxiAssignment',
      entityId: assignmentId,
      meta: { familyName: assignment.familyContact?.familyName },
    });

    return { message: 'Zuweisung entfernt' };
  }

  /**
   * Holt alle Zuweisungen für einen bestimmten Fahrer
   * Daten werden 24h nach Tafelrunde-Datum für normale Fahrer versteckt
   */
  async getMyAssignments(user: any, tafelrundeId?: string) {
    if (!user.isTaxi) {
      throw new ForbiddenException('Kein Taxi-Fahrer');
    }

    const where: any = { driverId: user.id };
    if (tafelrundeId) {
      where.tafelrundeId = tafelrundeId;
    }

    const assignments = await this.prisma.taxiAssignment.findMany({
      where,
      include: {
        tafelrunde: {
          select: {
            id: true,
            title: true,
            date: true,
            location: true,
            meetingPointMapName: true,
            meetingPointX: true,
            meetingPointY: true,
            pickupStartTime: true,
            arrivalDeadline: true,
          },
        },
        familyContact: {
          include: {
            mapAnnotations: {
              select: {
                id: true,
                mapName: true,
                x: true,
                y: true,
                icon: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Für normale Fahrer (nicht Leitung): Daten 24h nach Tafelrunde verstecken
    const isLead = user.isTaxiLead || KEY_CREATOR_ROLES.includes(user.role);
    if (!isLead) {
      const now = new Date();
      const twentyFourHoursMs = 24 * 60 * 60 * 1000;
      
      return assignments.filter(assignment => {
        if (!assignment.tafelrunde?.date) return true;
        const tafelrundeDate = new Date(assignment.tafelrunde.date);
        const timeSinceTafelrunde = now.getTime() - tafelrundeDate.getTime();
        // Zeige nur Zuweisungen deren Tafelrunde weniger als 24h her ist
        return timeSinceTafelrunde < twentyFourHoursMs;
      });
    }

    return assignments;
  }

  /**
   * Listet alle Taxi-Fahrer auf
   */
  async getAllDrivers(user: any) {
    console.log('[TaxiService] getAllDrivers called by:', user.username, user.role);
    
    if (!(await this.canManageAssignments(user))) {
      console.log('[TaxiService] User cannot manage assignments');
      throw new ForbiddenException('Keine Berechtigung');
    }

    const drivers = await this.prisma.user.findMany({
      where: {
        isTaxi: true,
      },
      select: {
        id: true,
        username: true,
        icFirstName: true,
        icLastName: true,
        isTaxiLead: true,
        createdAt: true,
      },
      orderBy: { username: 'asc' },
    });
    
    console.log('[TaxiService] Found drivers:', drivers.length, drivers.map(d => d.username));
    return drivers;
  }

  /**
   * Holt aktive Tafelrunden mit Taxi-relevanten Daten
   */
  async getActiveTafelrundenForTaxi(user: any) {
    if (!user.isTaxi && !user.isTaxiLead && !KEY_CREATOR_ROLES.includes(user.role)) {
      throw new ForbiddenException('Kein Zugriff');
    }

    // Hole Tafelrunden die PLANNED oder ACTIVE sind
    return this.prisma.tafelrunde.findMany({
      where: {
        status: {
          in: ['PLANNED', 'ACTIVE'],
        },
      },
      include: {
        families: {
          where: {
            attendanceStatus: TafelrundeAttendance.ATTENDING,
          },
          include: {
            familyContact: {
              select: {
                id: true,
                familyName: true,
                propertyZip: true,
              },
            },
          },
        },
        taxiAssignments: {
          include: {
            driver: {
              select: {
                id: true,
                username: true,
                icFirstName: true,
              },
            },
          },
        },
        _count: {
          select: {
            families: {
              where: { attendanceStatus: TafelrundeAttendance.ATTENDING },
            },
            taxiAssignments: true,
          },
        },
      },
      orderBy: { date: 'asc' },
    });
  }
}

