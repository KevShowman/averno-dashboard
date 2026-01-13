import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Role } from '@prisma/client';
import { ExclusionService } from '../common/exclusion/exclusion.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private exclusionService: ExclusionService,
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
      [Role.EL_NOVATO]: 1,
      [Role.EL_PROTECTOR]: 2,
      [Role.EL_CONFIDENTE]: 3,
      [Role.EL_PREFECTO]: 4,
      [Role.SOLDADO]: 5,
      [Role.EL_TENIENTE]: 6,
      [Role.EL_ENCARGADO]: 7,
      [Role.EL_MENTOR]: 8,
      [Role.EL_CUSTODIO]: 9,
      // Legacy erweiterte Rollen
      [Role.SICARIO]: 10,
      [Role.ROUTENVERWALTUNG]: 11,
      [Role.LOGISTICA]: 12,
      // Leaderschaft
      [Role.EL_MANO_DERECHA]: 13,
      [Role.DON_COMANDANTE]: 14,
      [Role.DON_CAPITAN]: 15,
      [Role.EL_PATRON]: 16,
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
      { key: Role.EL_PATRON, name: 'El Patrón', description: '👑 - Höchste Autorität' },
      { key: Role.DON_CAPITAN, name: 'Don - El Capitán', description: '⚔️ - Don' },
      { key: Role.DON_COMANDANTE, name: 'Don - El Comandante', description: '🛡️ - Don' },
      { key: Role.EL_MANO_DERECHA, name: 'El Mano Derecha', description: '🤝 - Berater' },
      // Ränge 7-9
      { key: Role.EL_CUSTODIO, name: 'El Custodio', description: '🔒 - Rang 9 - Sicherheit' },
      { key: Role.EL_MENTOR, name: 'El Mentor', description: '📚 - Rang 8 - Ausbilder' },
      { key: Role.EL_ENCARGADO, name: 'El Encargado', description: '🧰 - Rang 7 - Koordinator' },
      // Ränge 4-6
      { key: Role.EL_TENIENTE, name: 'El Teniente', description: '⭐ - Rang 6 - Unteroffizier' },
      { key: Role.SOLDADO, name: 'Soldado', description: '🧭 - Rang 5 - Soldat' },
      { key: Role.EL_PREFECTO, name: 'El Prefecto', description: '🐍 - Rang 4 - Kontrolle' },
      // Ränge 1-3
      { key: Role.EL_CONFIDENTE, name: 'El Confidente', description: '🫢 - Rang 3 - Vertrauensperson' },
      { key: Role.EL_PROTECTOR, name: 'El Protector', description: '🐢 - Rang 2 - Schutz' },
      { key: Role.EL_NOVATO, name: 'El Novato', description: '🌱 - Rang 1 - Neuling' },
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
      case Role.EL_PATRON: return 'El Patrón';
      case Role.DON_CAPITAN: return 'Don - El Capitán';
      case Role.DON_COMANDANTE: return 'Don - El Comandante';
      case Role.EL_MANO_DERECHA: return 'El Mano Derecha';
      // Ränge 7-9
      case Role.EL_CUSTODIO: return 'El Custodio';
      case Role.EL_MENTOR: return 'El Mentor';
      case Role.EL_ENCARGADO: return 'El Encargado';
      // Ränge 4-6
      case Role.EL_TENIENTE: return 'El Teniente';
      case Role.SOLDADO: return 'Soldado';
      case Role.EL_PREFECTO: return 'El Prefecto';
      // Ränge 1-3
      case Role.EL_CONFIDENTE: return 'El Confidente';
      case Role.EL_PROTECTOR: return 'El Protector';
      case Role.EL_NOVATO: return 'El Novato';
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