import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // Alle User abrufen
  async getAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        icFirstName: true,
        icLastName: true,
        avatarUrl: true,
        role: true,
        allRoles: true,
        discordRoles: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { username: 'asc' },
    });
  }

  // User nach ID abrufen
  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        icFirstName: true,
        icLastName: true,
        avatarUrl: true,
        role: true,
        allRoles: true,
        discordRoles: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User nicht gefunden');
    }

    return user;
  }

  // User nach Discord ID abrufen
  async getUserByDiscordId(discordId: string) {
    return this.prisma.user.findUnique({
      where: { discordId },
      select: {
        id: true,
        username: true,
        icFirstName: true,
        icLastName: true,
        avatarUrl: true,
        role: true,
        allRoles: true,
        discordRoles: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  // User-Rollen aktualisieren
  async updateUserRoles(userId: string, allRoles: Role[], updatedById: string) {
    // Prüfen ob User existiert
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User nicht gefunden');
    }

    // Validierung der Rollen
    if (allRoles.length === 0) {
      throw new BadRequestException('User muss mindestens eine Rolle haben');
    }

    // Hauptrolle bestimmen (höchste Rolle)
    const roleHierarchy = {
      [Role.SOLDADO]: 1,
      [Role.SICARIO]: 2,
      [Role.ROUTENVERWALTUNG]: 3,
      [Role.ASESOR]: 4,
      [Role.LOGISTICA]: 5,
      [Role.DON]: 6,
      [Role.EL_PATRON]: 7,
    };

    const highestRole = allRoles.reduce((highest, current) => {
      const currentLevel = roleHierarchy[current] || 0;
      const highestLevel = roleHierarchy[highest] || 0;
      return currentLevel > highestLevel ? current : highest;
    });

    // User aktualisieren
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        role: highestRole,
        allRoles: allRoles,
        updatedAt: new Date(),
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
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  // User nach Name/Username suchen
  async searchUsers(query: string) {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchTerm = query.trim().toLowerCase();

    return this.prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: searchTerm } },
          { icFirstName: { contains: searchTerm } },
          { icLastName: { contains: searchTerm } },
        ],
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
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { username: 'asc' },
      take: 20, // Limit auf 20 Ergebnisse
    });
  }

  // Alle verfügbaren Rollen abrufen
  async getAvailableRoles() {
    return [
      { key: Role.EL_PATRON, name: 'El Patrón', description: 'Höchste Autorität' },
      { key: Role.DON, name: 'Don', description: 'Zweithöchste Autorität' },
      { key: Role.ASESOR, name: 'Asesor', description: 'Berater und Führung' },
      { key: Role.LOGISTICA, name: 'Logistica', description: 'Lagerverwaltung' },
      { key: Role.ROUTENVERWALTUNG, name: 'Routenverwaltung', description: 'Route Management' },
      { key: Role.SICARIO, name: 'Sicario', description: 'Erweiterte Berechtigungen' },
      { key: Role.SOLDADO, name: 'Soldado', description: 'Standard Mitglied' },
    ];
  }

  // User-Statistiken
  async getUserStats() {
    const totalUsers = await this.prisma.user.count();
    
    // Hole alle User mit ihren allRoles
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        role: true,
        allRoles: true,
      },
    });

    // Zähle alle Rollen - jeder User wird für jede seiner Rollen gezählt
    const roleCounts: { [key: string]: number } = {};
    
    users.forEach(user => {
      // Alle Rollen des Users (allRoles oder fallback auf role)
      // JSON zu Array casten (MySQL verwendet Json statt native Arrays)
      const allRoles = Array.isArray(user.allRoles) ? user.allRoles as Role[] : [];
      const userRoles = allRoles.length > 0 ? allRoles : [user.role];
      
      // Zähle jede Rolle des Users
      userRoles.forEach(role => {
        roleCounts[role] = (roleCounts[role] || 0) + 1;
      });
    });

    // Konvertiere zu Array für Frontend
    const roleDistribution = Object.entries(roleCounts).map(([role, count]) => ({
      role,
      count,
      name: this.getRoleDisplayName(role as Role),
    }));

    return {
      totalUsers,
      roles: roleDistribution,
    };
  }

  private getRoleDisplayName(role: Role): string {
    switch (role) {
      case Role.EL_PATRON: return 'El Patrón';
      case Role.DON: return 'Don';
      case Role.ASESOR: return 'Asesor';
      case Role.ROUTENVERWALTUNG: return 'Routenverwaltung';
      case Role.LOGISTICA: return 'Logistica';
      case Role.SICARIO: return 'Sicario';
      case Role.SOLDADO: return 'Soldado';
      default: return role;
    }
  }

  // IC-Name aktualisieren
  async updateIcName(userId: string, icFirstName: string, icLastName: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        icFirstName,
        icLastName,
      },
      select: {
        id: true,
        username: true,
        icFirstName: true,
        icLastName: true,
        role: true,
        allRoles: true,
      },
    });
  }

  // User löschen (Fallback wenn Discord-Sync nicht funktioniert)
  async deleteUser(userId: string, requestingUserId: string) {
    // Prüfe ob User existiert
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        icFirstName: true,
        icLastName: true,
        role: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User nicht gefunden');
    }

    // Verhindere dass User sich selbst löscht
    if (userId === requestingUserId) {
      throw new BadRequestException('Du kannst dich nicht selbst löschen');
    }

    // Lösche User
    await this.prisma.user.delete({
      where: { id: userId },
    });

    return {
      message: `User ${user.username} wurde erfolgreich gelöscht`,
      deletedUser: {
        id: user.id,
        username: user.username,
        icFirstName: user.icFirstName,
        icLastName: user.icLastName,
      },
    };
  }
}