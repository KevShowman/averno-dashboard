import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MapName } from '@prisma/client';

@Injectable()
export class MapAnnotationsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // Prüft ob User Annotationen verwalten darf (Leadership, Contacto, Intelligencia, Partner oder MapPermission)
  private async canManageAnnotations(user: any): Promise<boolean> {
    // Partner haben jetzt vollen Zugriff auf die Karte
    if (user.isPartner) return true;

    const allowedRoles = [
      'PATRON',
      'DON',
      'CAPO',
      'CONTACTO',
      'INTELIGENCIA',
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

    // Prüfe MapPermission
    const permission = await this.prisma.mapPermission.findUnique({
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
    ];
    
    if (leadershipRoles.includes(user.role)) {
      return true;
    }
    
    const allRoles = user.allRoles || [];
    return allRoles.some((role: string) => leadershipRoles.includes(role));
  }

  async findAll(mapName?: MapName) {
    const where = mapName ? { mapName } : {};

    const annotations = await this.prisma.mapAnnotation.findMany({
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
            isKeyFamily: true,
            isOutdated: true,
            outdatedMarkedAt: true,
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

    // Kombiniere direkte POI-Flags mit Familie-Flags (POI hat Priorität, OR-Verknüpfung)
    return annotations.map((annotation) => ({
      ...annotation,
      // Effektive Flags: POI-Flag ODER Familie-Flag (falls Familie existiert)
      effectiveIsKeyFamily: annotation.isKeyFamily || annotation.familyContact?.isKeyFamily || false,
      effectiveIsOutdated: annotation.isOutdated || annotation.familyContact?.isOutdated || false,
    }));
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
      isKeyFamily?: boolean;
      isOutdated?: boolean;
    },
  ) {
    if (!(await this.canManageAnnotations(user))) {
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

    const annotation = await this.prisma.mapAnnotation.create({
      data: {
        mapName: data.mapName,
        x: data.x,
        y: data.y,
        icon: data.icon || 'home',
        label: data.label,
        familyContactId: data.familyContactId,
        isKeyFamily: data.isKeyFamily || false,
        isOutdated: data.isOutdated || false,
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

    // Audit Log
    await this.auditService.log({
      userId: user.id,
      action: 'MAP_MARKER_CREATED',
      entity: 'MapAnnotation',
      entityId: annotation.id,
      meta: {
        mapName: data.mapName,
        label: data.label || null,
        icon: data.icon || 'home',
        familyContactId: data.familyContactId || null,
      },
    });

    return annotation;
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
      isKeyFamily?: boolean;
      isOutdated?: boolean;
    },
  ) {
    if (!(await this.canManageAnnotations(user))) {
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

    const updated = await this.prisma.mapAnnotation.update({
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

    // Audit Log
    await this.auditService.log({
      userId: user.id,
      action: 'MAP_MARKER_UPDATED',
      entity: 'MapAnnotation',
      entityId: id,
      meta: {
        changes: data,
      },
    });

    return updated;
  }

  async delete(user: any, id: string) {
    if (!(await this.canManageAnnotations(user))) {
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

    await this.prisma.mapAnnotation.delete({
      where: { id },
    });

    // Audit Log
    await this.auditService.log({
      userId: user.id,
      action: 'MAP_MARKER_DELETED',
      entity: 'MapAnnotation',
      entityId: id,
      meta: {
        mapName: annotation.mapName,
        label: annotation.label,
        icon: annotation.icon,
      },
    });

    return { success: true };
  }

  // Hole alle verfügbaren FamilyContacts für Dropdown
  async getAvailableFamilyContacts() {
    return this.prisma.familyContact.findMany({
      select: {
        id: true,
        familyName: true,
        status: true,
        propertyZip: true,
        isKeyFamily: true,
        isOutdated: true,
      },
      orderBy: { familyName: 'asc' },
    });
  }

  // Statistik: Wie viele POIs sind mit Familien verknüpft
  async getFamilyLinkStats() {
    // Gesamtzahl der POIs
    const totalPOIs = await this.prisma.mapAnnotation.count();

    // Anzahl der POIs mit Familie verknüpft
    const linkedPOIs = await this.prisma.mapAnnotation.count({
      where: {
        familyContactId: { not: null },
      },
    });

    // Nicht verknüpfte POIs
    const unlinkedPOIs = totalPOIs - linkedPOIs;

    return {
      total: totalPOIs,
      linked: linkedPOIs,
      unlinked: unlinkedPOIs,
      percentage: totalPOIs > 0 ? Math.round((linkedPOIs / totalPOIs) * 100) : 0,
    };
  }

  // ============ MAP AREAS (Gebiete) ============

  async findAllAreas(mapName?: MapName) {
    const where = mapName ? { mapName } : {};

    return this.prisma.mapArea.findMany({
      where,
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
      orderBy: { createdAt: 'desc' },
    });
  }

  async createArea(
    user: any,
    data: {
      mapName: MapName;
      points: { x: number; y: number }[];
      label: string;
      color?: string;
    },
  ) {
    if (!(await this.canManageAnnotations(user))) {
      throw new ForbiddenException(
        'Nur Leadership, Contactos und Intelligencia können Gebiete erstellen',
      );
    }

    // Validiere Punkte (mindestens 3 für ein Polygon)
    if (!data.points || data.points.length < 3) {
      throw new ForbiddenException('Ein Gebiet benötigt mindestens 3 Punkte');
    }

    // Validiere alle Koordinaten (0-1)
    for (const point of data.points) {
      if (point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) {
        throw new ForbiddenException('Alle Koordinaten müssen zwischen 0 und 1 liegen');
      }
    }

    const area = await this.prisma.mapArea.create({
      data: {
        mapName: data.mapName,
        points: data.points,
        label: data.label,
        color: data.color || '#f59e0b',
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

    // Audit Log
    await this.auditService.log({
      userId: user.id,
      action: 'MAP_AREA_CREATED',
      entity: 'MapArea',
      entityId: area.id,
      meta: {
        mapName: data.mapName,
        label: data.label,
        color: data.color || '#f59e0b',
        pointsCount: data.points.length,
      },
    });

    return area;
  }

  async updateArea(
    user: any,
    id: string,
    data: {
      points?: { x: number; y: number }[];
      label?: string;
      color?: string;
    },
  ) {
    if (!(await this.canManageAnnotations(user))) {
      throw new ForbiddenException(
        'Nur Leadership, Contactos und Intelligencia können Gebiete bearbeiten',
      );
    }

    const area = await this.prisma.mapArea.findUnique({
      where: { id },
    });

    if (!area) {
      throw new NotFoundException('Gebiet nicht gefunden');
    }

    // Validiere Punkte falls angegeben
    if (data.points) {
      if (data.points.length < 3) {
        throw new ForbiddenException('Ein Gebiet benötigt mindestens 3 Punkte');
      }
      for (const point of data.points) {
        if (point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) {
          throw new ForbiddenException('Alle Koordinaten müssen zwischen 0 und 1 liegen');
        }
      }
    }

    const updatedArea = await this.prisma.mapArea.update({
      where: { id },
      data,
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

    // Audit Log
    await this.auditService.log({
      userId: user.id,
      action: 'MAP_AREA_UPDATED',
      entity: 'MapArea',
      entityId: id,
      meta: {
        changes: data,
      },
    });

    return updatedArea;
  }

  async deleteArea(user: any, id: string) {
    if (!(await this.canManageAnnotations(user))) {
      throw new ForbiddenException(
        'Nur Leadership, Contactos und Intelligencia können Gebiete löschen',
      );
    }

    const area = await this.prisma.mapArea.findUnique({
      where: { id },
    });

    if (!area) {
      throw new NotFoundException('Gebiet nicht gefunden');
    }

    await this.prisma.mapArea.delete({
      where: { id },
    });

    // Audit Log
    await this.auditService.log({
      userId: user.id,
      action: 'MAP_AREA_DELETED',
      entity: 'MapArea',
      entityId: id,
      meta: {
        mapName: area.mapName,
        label: area.label,
      },
    });

    return { success: true };
  }

  // ============ PERMISSION MANAGEMENT ============

  // Alle Map-Berechtigungen abrufen
  async getMapPermissions() {
    return this.prisma.mapPermission.findMany({
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

  // Map-Berechtigung hinzufügen
  async addMapPermission(grantedBy: any, userId: string) {
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
    const existing = await this.prisma.mapPermission.findUnique({
      where: { userId },
    });
    if (existing) {
      throw new ForbiddenException('Benutzer hat bereits eine Berechtigung');
    }

    const permission = await this.prisma.mapPermission.create({
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

    // Audit Log
    await this.auditService.log({
      userId: grantedBy.id,
      action: 'MAP_PERMISSION_GRANTED',
      entity: 'MapPermission',
      entityId: permission.id,
      meta: {
        targetUserId: userId,
        targetUsername: user.username,
      },
    });

    return permission;
  }

  // Map-Berechtigung entfernen
  async removeMapPermission(user: any, userId: string) {
    if (!this.isLeadership(user)) {
      throw new ForbiddenException('Nur Leadership kann Berechtigungen verwalten');
    }

    const permission = await this.prisma.mapPermission.findUnique({
      where: { userId },
    });

    if (!permission) {
      throw new NotFoundException('Berechtigung nicht gefunden');
    }

    await this.prisma.mapPermission.delete({
      where: { userId },
    });

    // Audit Log
    await this.auditService.log({
      userId: user.id,
      action: 'MAP_PERMISSION_REVOKED',
      entity: 'MapPermission',
      entityId: permission.id,
      meta: {
        targetUserId: userId,
      },
    });

    return { success: true };
  }

  // Prüfe ob User eine Map-Berechtigung hat (für Frontend)
  async hasMapPermission(userId: string): Promise<boolean> {
    const permission = await this.prisma.mapPermission.findUnique({
      where: { userId },
    });
    return !!permission;
  }

  // ============ SUGGESTION MANAGEMENT ============

  // Alle Vorschläge abrufen (nur für Berechtigte)
  async getAllSuggestions(user: any, mapName?: MapName) {
    if (!(await this.canManageAnnotations(user))) {
      throw new ForbiddenException('Keine Berechtigung');
    }

    const where = mapName ? { mapName } : {};

    return this.prisma.mapSuggestion.findMany({
      where,
      include: {
        familyContact: {
          select: {
            id: true,
            familyName: true,
            status: true,
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

  // Eigene Vorschläge abrufen
  async getMySuggestions(userId: string) {
    return this.prisma.mapSuggestion.findMany({
      where: { createdById: userId },
      include: {
        familyContact: {
          select: {
            id: true,
            familyName: true,
            status: true,
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
  }

  // Vorschlag erstellen (für alle User ohne Berechtigung)
  async createSuggestion(
    user: any,
    data: {
      mapName: MapName;
      x: number;
      y: number;
      icon?: string;
      label?: string;
      familyContactId?: string;
      isKeyFamily?: boolean;
      isOutdated?: boolean;
    },
  ) {
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

    const suggestion = await this.prisma.mapSuggestion.create({
      data: {
        mapName: data.mapName,
        x: data.x,
        y: data.y,
        icon: data.icon || 'home',
        label: data.label,
        familyContactId: data.familyContactId,
        isKeyFamily: data.isKeyFamily ?? false,
        isOutdated: data.isOutdated ?? false,
        createdById: user.id,
      },
      include: {
        familyContact: {
          select: {
            id: true,
            familyName: true,
            status: true,
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

    // Audit Log
    await this.auditService.log({
      userId: user.id,
      action: 'MAP_SUGGESTION_CREATED',
      entity: 'MapSuggestion',
      entityId: suggestion.id,
      meta: {
        mapName: data.mapName,
        label: data.label || null,
        icon: data.icon || 'home',
      },
    });

    return suggestion;
  }

  // Vorschlag genehmigen (erstellt eine echte Annotation)
  async approveSuggestion(user: any, id: string) {
    if (!(await this.canManageAnnotations(user))) {
      throw new ForbiddenException('Keine Berechtigung');
    }

    const suggestion = await this.prisma.mapSuggestion.findUnique({
      where: { id },
    });

    if (!suggestion) {
      throw new NotFoundException('Vorschlag nicht gefunden');
    }

    if (suggestion.status !== 'PENDING') {
      throw new ForbiddenException('Vorschlag wurde bereits bearbeitet');
    }

    // Erstelle die echte Annotation
    await this.prisma.mapAnnotation.create({
      data: {
        mapName: suggestion.mapName,
        x: suggestion.x,
        y: suggestion.y,
        icon: suggestion.icon,
        label: suggestion.label,
        familyContactId: suggestion.familyContactId,
        isKeyFamily: suggestion.isKeyFamily,
        isOutdated: suggestion.isOutdated,
        createdById: user.id, // Der genehmigende User wird als Ersteller eingetragen
      },
    });

    // Aktualisiere den Vorschlag-Status
    const approved = await this.prisma.mapSuggestion.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedById: user.id,
        reviewedAt: new Date(),
      },
      include: {
        familyContact: {
          select: {
            id: true,
            familyName: true,
            status: true,
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
      action: 'MAP_SUGGESTION_APPROVED',
      entity: 'MapSuggestion',
      entityId: id,
      meta: {
        mapName: suggestion.mapName,
        label: suggestion.label,
        createdById: suggestion.createdById,
      },
    });

    return approved;
  }

  // Vorschlag ablehnen
  async rejectSuggestion(user: any, id: string, reviewNote?: string) {
    if (!(await this.canManageAnnotations(user))) {
      throw new ForbiddenException('Keine Berechtigung');
    }

    const suggestion = await this.prisma.mapSuggestion.findUnique({
      where: { id },
    });

    if (!suggestion) {
      throw new NotFoundException('Vorschlag nicht gefunden');
    }

    if (suggestion.status !== 'PENDING') {
      throw new ForbiddenException('Vorschlag wurde bereits bearbeitet');
    }

    const rejected = await this.prisma.mapSuggestion.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedById: user.id,
        reviewedAt: new Date(),
        reviewNote,
      },
      include: {
        familyContact: {
          select: {
            id: true,
            familyName: true,
            status: true,
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
      action: 'MAP_SUGGESTION_REJECTED',
      entity: 'MapSuggestion',
      entityId: id,
      meta: {
        mapName: suggestion.mapName,
        label: suggestion.label,
        createdById: suggestion.createdById,
        reviewNote: reviewNote || null,
      },
    });

    return rejected;
  }

  // Vorschlag löschen (nur eigene oder als Berechtigter)
  async deleteSuggestion(user: any, id: string) {
    const suggestion = await this.prisma.mapSuggestion.findUnique({
      where: { id },
    });

    if (!suggestion) {
      throw new NotFoundException('Vorschlag nicht gefunden');
    }

    // Nur eigene Vorschläge oder als Berechtigter
    const canManage = await this.canManageAnnotations(user);
    if (suggestion.createdById !== user.id && !canManage) {
      throw new ForbiddenException('Keine Berechtigung');
    }

    await this.prisma.mapSuggestion.delete({
      where: { id },
    });

    // Audit Log
    await this.auditService.log({
      userId: user.id,
      action: 'MAP_SUGGESTION_DELETED',
      entity: 'MapSuggestion',
      entityId: id,
      meta: {
        mapName: suggestion.mapName,
        label: suggestion.label,
        wasOwnSuggestion: suggestion.createdById === user.id,
      },
    });

    return { success: true };
  }

  // Anzahl offener Vorschläge (für Badge im UI)
  async getPendingSuggestionsCount(): Promise<number> {
    return this.prisma.mapSuggestion.count({
      where: { status: 'PENDING' },
    });
  }
}
