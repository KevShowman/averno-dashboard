import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Role } from '@prisma/client';

export interface RoleAssignmentDto {
  roleId: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

@Injectable()
export class OrganigrammService {
  // Mapping von System-Rollen zu Organigramm-Kategorien
  private readonly roleMapping: Record<Role, string> = {
    // Leaderschaft
    [Role.EL_PATRON]: 'patron',
    [Role.DON_CAPITAN]: 'capitan',
    [Role.DON_COMANDANTE]: 'comandante',
    [Role.EL_MANO_DERECHA]: 'mano-derecha',
    
    // Funktionsrollen
    [Role.CONSEJERO]: 'consejero',
    [Role.RUTAS]: 'rutas',
    [Role.LOGISTICA]: 'logistica',
    [Role.INTELIGENCIA]: 'inteligencia',
    [Role.FORMACION]: 'formacion',
    [Role.SICARIO]: 'sicario',
    [Role.CONTACTO]: 'contacto',
    
    // Normale Ränge
    [Role.EL_CUSTODIO]: 'range-7-9',
    [Role.EL_MENTOR]: 'range-7-9',
    [Role.EL_ENCARGADO]: 'range-7-9',
    [Role.EL_TENIENTE]: 'range-4-6',
    [Role.SOLDADO]: 'range-4-6',
    [Role.EL_PREFECTO]: 'range-4-6',
    [Role.EL_CONFIDENTE]: 'range-1-3',
    [Role.EL_PROTECTOR]: 'range-1-3',
    [Role.EL_NOVATO]: 'range-1-3',
    
    // Legacy
    [Role.ROUTENVERWALTUNG]: 'rutas',
    [Role.FUTURO]: 'range-1-3',
    [Role.ADMIN]: 'patron',
    [Role.QUARTIERMEISTER]: 'logistica',
    [Role.MITGLIED]: 'range-1-3',
    [Role.GAST]: 'range-1-3',
  };

  constructor(private prisma: PrismaService) {}

  /**
   * Gibt alle Rollen-Zuordnungen basierend auf user.allRoles automatisch zurück
   */
  async getAllAssignments(): Promise<Record<string, RoleAssignmentDto[]>> {
    // Hole alle User mit ihren Rollen
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        icFirstName: true,
        icLastName: true,
        avatarUrl: true,
        role: true,
        allRoles: true,
      },
    });

    // Gruppiere nach roleId (Organigramm-Kategorien)
    const grouped: Record<string, RoleAssignmentDto[]> = {};

    for (const user of users) {
      // Alle Rollen des Users (allRoles oder fallback auf role)
      const allRoles = Array.isArray(user.allRoles) ? (user.allRoles as Role[]) : [];
      const userRoles = allRoles.length > 0 ? allRoles : [user.role];

      const displayName =
        user.icFirstName && user.icLastName
          ? `${user.icFirstName} ${user.icLastName}`
          : user.username;

      // Für jede Rolle des Users, füge ihn zur entsprechenden Organigramm-Kategorie hinzu
      userRoles.forEach((role) => {
        const organigrammCategory = this.roleMapping[role as Role];
        if (organigrammCategory) {
          if (!grouped[organigrammCategory]) {
            grouped[organigrammCategory] = [];
          }

          // Prüfe ob User bereits in dieser Kategorie ist (avoid duplicates)
          const exists = grouped[organigrammCategory].some((m) => m.userId === user.id);
          if (!exists) {
            grouped[organigrammCategory].push({
              roleId: organigrammCategory,
              userId: user.id,
              username: user.username,
              displayName,
              avatarUrl: user.avatarUrl || undefined,
            });
          }
        }
      });
    }

    return grouped;
  }
}
