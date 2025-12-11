import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { MapName } from '@prisma/client';

@Injectable()
export class MapAnnotationsService {
  constructor(private prisma: PrismaService) {}

  // Prüft ob User Annotationen verwalten darf (Leadership, Contacto, Intelligencia)
  private canManageAnnotations(user: any): boolean {
    const allowedRoles = [
      'EL_PATRON',
      'DON_CAPITAN',
      'DON_COMANDANTE',
      'EL_MANO_DERECHA',
      'CONTACTO',
      'INTELLIGENCIA',
    ];

    // Prüfe Hauptrolle
    if (allowedRoles.includes(user.role)) {
      return true;
    }

    // Prüfe zusätzliche Rollen
    const allRoles = user.allRoles || [];
    return allRoles.some((role: string) => allowedRoles.includes(role));
  }

  async findAll(mapName?: MapName) {
    const where = mapName ? { mapName } : {};

    return this.prisma.mapAnnotation.findMany({
      where,
      include: {
        familyContact: {
          select: {
            id: true,
            familyName: true,
            status: true,
            propertyZip: true,
            contact1FirstName: true,
            contact1LastName: true,
            contact1Phone: true,
            contact2FirstName: true,
            contact2LastName: true,
            contact2Phone: true,
            leadershipInfo: true,
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
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const annotation = await this.prisma.mapAnnotation.findUnique({
      where: { id },
      include: {
        familyContact: true,
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

    if (!annotation) {
      throw new NotFoundException('Annotation nicht gefunden');
    }

    return annotation;
  }

  async create(
    user: any,
    data: {
      mapName: MapName;
      x: number;
      y: number;
      icon?: string;
      label?: string;
      familyContactId?: string;
    },
  ) {
    if (!this.canManageAnnotations(user)) {
      throw new ForbiddenException(
        'Nur Leadership, Contactos und Intelligencia können Annotationen erstellen',
      );
    }

    // Validiere Koordinaten (0-1)
    if (data.x < 0 || data.x > 1 || data.y < 0 || data.y > 1) {
      throw new ForbiddenException('Koordinaten müssen zwischen 0 und 1 liegen');
    }

    // Validiere FamilyContact falls angegeben
    if (data.familyContactId) {
      const familyContact = await this.prisma.familyContact.findUnique({
        where: { id: data.familyContactId },
      });
      if (!familyContact) {
        throw new NotFoundException('Familien-Kontakt nicht gefunden');
      }
    }

    return this.prisma.mapAnnotation.create({
      data: {
        mapName: data.mapName,
        x: data.x,
        y: data.y,
        icon: data.icon || 'home',
        label: data.label,
        familyContactId: data.familyContactId,
        createdById: user.id,
      },
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
            icFirstName: true,
            icLastName: true,
          },
        },
      },
    });
  }

  async update(
    user: any,
    id: string,
    data: {
      x?: number;
      y?: number;
      icon?: string;
      label?: string;
      familyContactId?: string | null;
    },
  ) {
    if (!this.canManageAnnotations(user)) {
      throw new ForbiddenException(
        'Nur Leadership, Contactos und Intelligencia können Annotationen bearbeiten',
      );
    }

    const annotation = await this.prisma.mapAnnotation.findUnique({
      where: { id },
    });

    if (!annotation) {
      throw new NotFoundException('Annotation nicht gefunden');
    }

    // Validiere Koordinaten falls angegeben
    if (data.x !== undefined && (data.x < 0 || data.x > 1)) {
      throw new ForbiddenException('X-Koordinate muss zwischen 0 und 1 liegen');
    }
    if (data.y !== undefined && (data.y < 0 || data.y > 1)) {
      throw new ForbiddenException('Y-Koordinate muss zwischen 0 und 1 liegen');
    }

    // Validiere FamilyContact falls angegeben
    if (data.familyContactId) {
      const familyContact = await this.prisma.familyContact.findUnique({
        where: { id: data.familyContactId },
      });
      if (!familyContact) {
        throw new NotFoundException('Familien-Kontakt nicht gefunden');
      }
    }

    return this.prisma.mapAnnotation.update({
      where: { id },
      data: {
        ...data,
        // Setze familyContactId auf null wenn explizit null übergeben wird
        familyContactId: data.familyContactId === null ? null : data.familyContactId,
      },
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
            icFirstName: true,
            icLastName: true,
          },
        },
      },
    });
  }

  async delete(user: any, id: string) {
    if (!this.canManageAnnotations(user)) {
      throw new ForbiddenException(
        'Nur Leadership, Contactos und Intelligencia können Annotationen löschen',
      );
    }

    const annotation = await this.prisma.mapAnnotation.findUnique({
      where: { id },
    });

    if (!annotation) {
      throw new NotFoundException('Annotation nicht gefunden');
    }

    return this.prisma.mapAnnotation.delete({
      where: { id },
    });
  }

  // Hole alle verfügbaren FamilyContacts für Dropdown
  async getAvailableFamilyContacts() {
    return this.prisma.familyContact.findMany({
      select: {
        id: true,
        familyName: true,
        status: true,
        propertyZip: true,
      },
      orderBy: { familyName: 'asc' },
    });
  }
}

