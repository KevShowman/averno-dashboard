import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class FamilyContactsService {
  constructor(private prisma: PrismaService) {}

  // Prüft ob User Contacto oder Leadership ist
  private canManageContacts(user: any): boolean {
    const allowedRoles = [
      'EL_PATRON',
      'DON_CAPITAN', 
      'DON_COMANDANTE',
      'EL_MANO_DERECHA',
      'CONTACTO',
    ];
    
    // Prüfe Hauptrolle
    if (allowedRoles.includes(user.role)) {
      return true;
    }
    
    // Prüfe zusätzliche Rollen
    const allRoles = user.allRoles || [];
    return allRoles.some((role: string) => allowedRoles.includes(role));
  }

  async findAll() {
    return this.prisma.familyContact.findMany({
      orderBy: { familyName: 'asc' },
    });
  }

  async findOne(id: string) {
    const contact = await this.prisma.familyContact.findUnique({
      where: { id },
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
  }) {
    if (!this.canManageContacts(user)) {
      throw new ForbiddenException('Nur Contactos und Leadership können Kontakte verwalten');
    }

    return this.prisma.familyContact.create({
      data: {
        ...data,
        createdById: user.id,
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
  }) {
    if (!this.canManageContacts(user)) {
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
    });
  }

  async delete(user: any, id: string) {
    if (!this.canManageContacts(user)) {
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

