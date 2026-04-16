import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Discord-Rolle ID für komplett ausgeschlossene Mitglieder (z.B. inaktiv, gesperrt)
// Diese User werden von ALLEN Listen und Systemen ausgeschlossen
export const EXCLUDED_DISCORD_ROLE_ID = '1460767399568736499';

@Injectable()
export class ExclusionService {
  constructor(private prisma: PrismaService) {}

  /**
   * Prüft ob ein User die ausgeschlossene Discord-Rolle hat
   */
  hasExcludedRole(discordRoles: string[] | any): boolean {
    if (!discordRoles) return false;
    
    // Falls discordRoles als JSON-String gespeichert ist
    let roles: string[] = [];
    if (typeof discordRoles === 'string') {
      try {
        roles = JSON.parse(discordRoles);
      } catch {
        return false;
      }
    } else if (Array.isArray(discordRoles)) {
      roles = discordRoles;
    }

    return roles.includes(EXCLUDED_DISCORD_ROLE_ID);
  }

  /**
   * Gibt eine WHERE-Clause zurück die ausgeschlossene User filtert
   * HINWEIS: Da discordRoles ein JSON-Feld ist, müssen wir im Code filtern
   */
  async getExcludedUserIds(): Promise<string[]> {
    const allUsers = await this.prisma.user.findMany({
      select: {
        id: true,
        discordRoles: true,
      },
    });

    return allUsers
      .filter(user => this.hasExcludedRole(user.discordRoles))
      .map(user => user.id);
  }

  /**
   * Gibt alle aktiven (nicht ausgeschlossenen) internen User zurück
   */
  async getActiveInternalUsers() {
    const allUsers = await this.prisma.user.findMany({
      where: {
        isPartner: false,
        isTaxi: false,
      },
      select: {
        id: true,
        username: true,
        icFirstName: true,
        icLastName: true,
        avatarUrl: true,
        role: true,
        allRoles: true,
        discordRoles: true,
      },
    });

    // Filter ausgeschlossene User
    return allUsers.filter(user => !this.hasExcludedRole(user.discordRoles));
  }

  /**
   * Prüft ob ein spezifischer User ausgeschlossen ist
   */
  async isUserExcluded(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { discordRoles: true },
    });

    if (!user) return true; // User nicht gefunden = ausgeschlossen behandeln

    return this.hasExcludedRole(user.discordRoles);
  }
}
