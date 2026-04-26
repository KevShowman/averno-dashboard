import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Role } from '@prisma/client';
import { ExclusionService } from '../common/exclusion/exclusion.service';
import { DiscordService } from '../discord/discord.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private exclusionService: ExclusionService,
    private discordService: DiscordService,
  ) {}

  // Alle User abrufen (keine Partner/Taxi/Ausgeschlossene - nur interne Mitglieder)
  async getAllUsers() {
    const users = await this.prisma.user.findMany({
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
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { username: 'asc' },
    });

    // Filter ausgeschlossene User (Discord-Rolle)
    return users.filter(u => !this.exclusionService.hasExcludedRole(u.discordRoles));
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
      // Legacy-Rollen
      [Role.FUTURO]: 0,
      // Neue Ränge (1-9)
      [Role.RECLUTA]: 1,
      [Role.COYOTE]: 2,
      [Role.MERCADER]: 3,
      [Role.CAPATAZ]: 4,
      [Role.LINCE]: 5,
      [Role.EL_MUDO]: 6,
      [Role.GESTION_DE_RUTAS]: 7,
      [Role.PADRINO]: 8,
      [Role.CONSULTORA]: 9,
      // Leaderschaft (10-12)
      [Role.CAPO]: 10,
      [Role.DON]: 11,
      [Role.PATRON]: 12,
      // Legacy erweiterte Rollen
      [Role.SICARIO]: 5,
      [Role.ROUTENVERWALTUNG]: 6,
      [Role.LOGISTICA]: 5,
    };

    const highestRole = allRoles.reduce((highest, current) => {
      const currentLevel = roleHierarchy[current] || 0;
      const highestLevel = roleHierarchy[highest] || 0;
      return currentLevel > highestLevel ? current : highest;
    });

    // User aktualisieren
    const updatedUser = await this.prisma.user.update({
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

    // Discord-Rollen synchronisieren (fire-and-forget, Fehler sollen den Request nicht blockieren)
    this.discordService.syncSystemRolesToDiscord(userId, allRoles).catch(err =>
      console.error('Fehler beim Discord-Rollen-Sync:', err)
    );

    return updatedUser;
  }

  // User nach Name/Username suchen (keine Partner/Taxi - nur interne Mitglieder)
  async searchUsers(query: string) {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchTerm = query.trim().toLowerCase();

    const users = await this.prisma.user.findMany({
      where: {
        isPartner: false,
        isTaxi: false,
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
      take: 40, // Mehr holen für Filterung
    });

    // Filter ausgeschlossene User (Discord-Rolle) und limitiere auf 20
    return users
      .filter(u => !this.exclusionService.hasExcludedRole(u.discordRoles))
      .slice(0, 20);
  }

  // Alle verfügbaren Rollen abrufen
  async getAvailableRoles() {
    return [
      // Leaderschaft
      { key: Role.PATRON, name: 'Patron', description: '👑 - Rang 12' },
      { key: Role.DON, name: 'Don', description: '⚔️ - Rang 11' },
      { key: Role.CAPO, name: 'Capo', description: '🛡️ - Rang 10' },
      // Ränge 7-9
      { key: Role.CONSULTORA, name: 'Consultora', description: '🔒 - Rang 9 - Sicherheit' },
      { key: Role.PADRINO, name: 'Padrino', description: '📚 - Rang 8 - Ausbilder' },
      { key: Role.GESTION_DE_RUTAS, name: 'Gestión de Rutas', description: '🧰 - Rang 7 - Koordinator' },
      // Ränge 4-6
      { key: Role.EL_MUDO, name: 'El Mudo', description: '⭐ - Rang 6 - Unteroffizier' },
      { key: Role.LINCE, name: 'Lince', description: '🧭 - Rang 5 - Soldat' },
      { key: Role.CAPATAZ, name: 'Capataz', description: '🐍 - Rang 4 - Kontrolle' },
      // Ränge 1-3
      { key: Role.MERCADER, name: 'Mercader', description: '🫢 - Rang 3 - Vertrauensperson' },
      { key: Role.COYOTE, name: 'Coyote', description: '🐢 - Rang 2 - Schutz' },
      { key: Role.RECLUTA, name: 'Recluta', description: '🌱 - Rang 1 - Neuling' },
      // Legacy
      { key: Role.FUTURO, name: 'Futuro', description: 'Anwärter (Legacy)' },
      { key: Role.SICARIO, name: 'Sicario', description: 'Erweiterte Berechtigungen (Legacy)' },
      { key: Role.LOGISTICA, name: 'Logistica', description: 'Lagerverwaltung (Legacy)' },
      { key: Role.ROUTENVERWALTUNG, name: 'Routenverwaltung', description: 'Route Management (Legacy)' },
    ];
  }

  // User-Statistiken (nur interne Mitglieder)
  async getUserStats() {
    const totalUsers = await this.prisma.user.count({
      where: {
        isPartner: false,
        isTaxi: false,
      },
    });
    
    // Hole alle User mit ihren allRoles (keine Partner/Taxi)
    const users = await this.prisma.user.findMany({
      where: {
        isPartner: false,
        isTaxi: false,
      },
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
      // Leaderschaft
      case Role.PATRON: return 'Patron';
      case Role.DON: return 'Don';
      case Role.CAPO: return 'Capo';
      // Ränge 7-9
      case Role.CONSULTORA: return 'Consultora';
      case Role.PADRINO: return 'Padrino';
      case Role.GESTION_DE_RUTAS: return 'Gestión de Rutas';
      // Ränge 4-6
      case Role.EL_MUDO: return 'El Mudo';
      case Role.LINCE: return 'Lince';
      case Role.CAPATAZ: return 'Capataz';
      // Ränge 1-3
      case Role.MERCADER: return 'Mercader';
      case Role.COYOTE: return 'Coyote';
      case Role.RECLUTA: return 'Recluta';
      // Funktionsrollen
      case Role.CONSEJERO: return 'Consejero/a';
      case Role.RUTAS: return 'Rutas';
      case Role.LOGISTICA: return 'Logística';
      case Role.INTELIGENCIA: return 'Inteligencia';
      case Role.FORMACION: return 'Formación';
      case Role.SICARIO: return 'Sicario';
      case Role.CONTACTO: return 'Contacto';
      // Legacy
      case Role.FUTURO: return 'Futuro';
      case Role.ROUTENVERWALTUNG: return 'Routenverwaltung';
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
        gender: true,
        role: true,
        allRoles: true,
      },
    });
  }

  // Geschlecht aktualisieren
  async updateGender(userId: string, gender: 'MALE' | 'FEMALE') {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        gender,
      },
      select: {
        id: true,
        username: true,
        icFirstName: true,
        icLastName: true,
        gender: true,
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
