import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class FamilyContactsService {
  constructor(private prisma: PrismaService) {}

  // Prüft ob User Contacto, Leadership, Partner ist ODER eine ListPermission hat
  private async canManageContacts(user: any): Promise<boolean> {
    // Partner haben jetzt vollen Zugriff auf die Listenführung
    if (user.isPartner) return true;

    const allowedRoles = [
      'PATRON',
      'DON', 
      'CAPO',
      'CAPO',
      'CONTACTO',
    ];
    
    // Prüfe Hauptrolle
    if (allowedRoles.includes(user.role)) {
      return true;
    }
    
    // Prüfe zusätzliche Rollen
    const allRoles = user.allRoles || [];
    if (allRoles.some((role: string) => allowedRoles.includes(role))) {
      return true;
    }

    // Prüfe ListPermission
    const permission = await this.prisma.listPermission.findUnique({
      where: { userId: user.id },
    });
    return !!permission;
  }

  // Prüft ob User Leadership ist (für Berechtigungsverwaltung)
  private isLeadership(user: any): boolean {
    const leadershipRoles = [
      'PATRON',
      'DON',
      'CAPO',
      'ADMIN',
    ];
    
    if (leadershipRoles.includes(user.role)) {
      return true;
    }
    
    const allRoles = user.allRoles || [];
    return allRoles.some((role: string) => leadershipRoles.includes(role));
  }

  async findAll() {
    return this.prisma.familyContact.findMany({
      orderBy: { familyName: 'asc' },
      include: {
        outdatedMarkedBy: {
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

  async findOne(id: string) {
    const contact = await this.prisma.familyContact.findUnique({
      where: { id },
      include: {
        outdatedMarkedBy: {
          select: {
            id: true,
            username: true,
            icFirstName: true,
            icLastName: true,
          },
        },
      },
    });

    if (!contact) {
      throw new NotFoundException('Familien-Kontakt nicht gefunden');
    }

    return contact;
  }

  async create(user: any, data: {
    familyName: string;
    status?: 'UNKNOWN' | 'ACTIVE' | 'ENDANGERED' | 'DISSOLVED';
    propertyZip?: string;
    contact1FirstName?: string;
    contact1LastName?: string;
    contact1Phone?: string;
    contact2FirstName?: string;
    contact2LastName?: string;
    contact2Phone?: string;
    leadershipInfo?: string;
    notes?: string;
    isKeyFamily?: boolean;
  }) {
    if (!(await this.canManageContacts(user))) {
      throw new ForbiddenException('Nur Contactos und Leadership können Kontakte verwalten');
    }

    return this.prisma.familyContact.create({
      data: {
        ...data,
        createdById: user.id,
      },
      include: {
        outdatedMarkedBy: {
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

  async update(user: any, id: string, data: {
    familyName?: string;
    status?: 'UNKNOWN' | 'ACTIVE' | 'ENDANGERED' | 'DISSOLVED';
    propertyZip?: string;
    contact1FirstName?: string;
    contact1LastName?: string;
    contact1Phone?: string;
    contact2FirstName?: string;
    contact2LastName?: string;
    contact2Phone?: string;
    leadershipInfo?: string;
    notes?: string;
    isKeyFamily?: boolean;
  }) {
    if (!(await this.canManageContacts(user))) {
      throw new ForbiddenException('Nur Contactos und Leadership können Kontakte verwalten');
    }

    const contact = await this.prisma.familyContact.findUnique({
      where: { id },
    });

    if (!contact) {
      throw new NotFoundException('Familien-Kontakt nicht gefunden');
    }

    return this.prisma.familyContact.update({
      where: { id },
      data,
      include: {
        outdatedMarkedBy: {
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

  // Als veraltet markieren - für ALLE User zugänglich
  async markOutdated(user: any, id: string, isOutdated: boolean, comment?: string) {
    const contact = await this.prisma.familyContact.findUnique({
      where: { id },
    });

    if (!contact) {
      throw new NotFoundException('Familien-Kontakt nicht gefunden');
    }

    return this.prisma.familyContact.update({
      where: { id },
      data: {
        isOutdated,
        outdatedMarkedAt: isOutdated ? new Date() : null,
        outdatedMarkedById: isOutdated ? user.id : null,
        outdatedComment: isOutdated ? (comment || null) : null,
      },
      include: {
        outdatedMarkedBy: {
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

  async delete(user: any, id: string) {
    if (!(await this.canManageContacts(user))) {
      throw new ForbiddenException('Nur Contactos und Leadership können Kontakte verwalten');
    }

    const contact = await this.prisma.familyContact.findUnique({
      where: { id },
    });

    if (!contact) {
      throw new NotFoundException('Familien-Kontakt nicht gefunden');
    }

    return this.prisma.familyContact.delete({
      where: { id },
    });
  }

  // ============ PERMISSION MANAGEMENT ============

  // Eigene List-Berechtigung prüfen
  async checkMyListPermission(userId: string): Promise<{ hasPermission: boolean }> {
    const permission = await this.prisma.listPermission.findUnique({
      where: { userId },
    });
    return { hasPermission: !!permission };
  }

  // Alle List-Berechtigungen abrufen
  async getListPermissions() {
    return this.prisma.listPermission.findMany({
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

  // List-Berechtigung hinzufügen
  async addListPermission(grantedBy: any, userId: string) {
    if (!this.isLeadership(grantedBy)) {
      throw new ForbiddenException('Nur Leadership kann Berechtigungen verwalten');
    }

    // Prüfe ob User existiert
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('Benutzer nicht gefunden');
    }

    // Prüfe ob bereits vorhanden
    const existing = await this.prisma.listPermission.findUnique({
      where: { userId },
    });
    if (existing) {
      throw new ForbiddenException('Benutzer hat bereits eine Berechtigung');
    }

    return this.prisma.listPermission.create({
      data: {
        userId,
        grantedById: grantedBy.id,
      },
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

  // List-Berechtigung entfernen
  async removeListPermission(user: any, userId: string) {
    if (!this.isLeadership(user)) {
      throw new ForbiddenException('Nur Leadership kann Berechtigungen verwalten');
    }

    const permission = await this.prisma.listPermission.findUnique({
      where: { userId },
    });

    if (!permission) {
      throw new NotFoundException('Berechtigung nicht gefunden');
    }

    return this.prisma.listPermission.delete({
      where: { userId },
    });
  }

  // Prüfe ob User eine Berechtigung hat (für Frontend)
  async hasListPermission(userId: string): Promise<boolean> {
    const permission = await this.prisma.listPermission.findUnique({
      where: { userId },
    });
    return !!permission;
  }

  async exportToCSV() {
    const contacts = await this.prisma.familyContact.findMany({
      orderBy: { familyName: 'asc' },
    });

    const statusMap: Record<string, string> = {
      'UNKNOWN': 'Unbekannt',
      'ACTIVE': 'Aktiv',
      'ENDANGERED': 'Gefährdet',
      'DISSOLVED': 'Aufgelöst',
    };

    // CSV Header
    const headers = [
      'Familienname',
      'Status',
      'Anwesen PLZ',
      'AP1 Vorname',
      'AP1 Nachname', 
      'AP1 Telefon',
      'AP2 Vorname',
      'AP2 Nachname',
      'AP2 Telefon',
      'Führung/Patron',
      'Notizen',
    ];

    // CSV Rows
    const rows = contacts.map(c => [
      c.familyName || '',
      statusMap[c.status] || c.status || '',
      c.propertyZip || '',
      c.contact1FirstName || '',
      c.contact1LastName || '',
      c.contact1Phone || '',
      c.contact2FirstName || '',
      c.contact2LastName || '',
      c.contact2Phone || '',
      c.leadershipInfo || '',
      (c.notes || '').replace(/[\n\r]/g, ' '), // Zeilenumbrüche entfernen
    ]);

    // CSV String bauen
    const escapeCSV = (str: string) => {
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvLines = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(',')),
    ];

    return csvLines.join('\n');
  }
}

