import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  // Leadership-Rollen
  private readonly leadershipRoles = [
    'EL_PATRON',
    'DON_CAPITAN',
    'DON_COMANDANTE',
    'EL_MANO_DERECHA',
  ];

  // Prüft ob User Leadership ist
  private isLeadership(user: any): boolean {
    if (this.leadershipRoles.includes(user.role)) return true;
    const allRoles = user.allRoles || [];
    return allRoles.some((role: string) => this.leadershipRoles.includes(role));
  }

  // Prüft ob User Intelligencia ist
  private isIntelligencia(user: any): boolean {
    if (user.role === 'INTELIGENCIA') return true;
    const allRoles = user.allRoles || [];
    return allRoles.includes('INTELIGENCIA');
  }

  // Prüft ob User Anwesenheiten eintragen darf
  async canMarkAttendance(user: any): Promise<boolean> {
    // Leadership und Intelligencia dürfen immer
    if (this.isLeadership(user) || this.isIntelligencia(user)) {
      return true;
    }
    
    // Prüfe ob User explizite Berechtigung hat
    const permission = await this.prisma.attendancePermission.findUnique({
      where: { userId: user.id },
    });
    
    return !!permission;
  }

  // Hole Wochen-Übersicht
  async getWeekOverview(weekString: string) {
    // weekString format: "2024-W50"
    const [year, weekPart] = weekString.split('-W');
    const weekNumber = parseInt(weekPart);
    
    // Berechne Start und Ende der Woche
    const { startDate, endDate } = this.getWeekDates(parseInt(year), weekNumber);
    
    // Hole alle User (aktive Mitglieder)
    const users = await this.prisma.user.findMany({
      where: {
        role: { notIn: ['FUTURO', 'GAST'] },
      },
      select: {
        id: true,
        username: true,
        icFirstName: true,
        icLastName: true,
        role: true,
        avatarUrl: true,
      },
      orderBy: [
        { icFirstName: 'asc' },
        { username: 'asc' },
      ],
    });
    
    // Hole alle Anwesenheiten für die Woche
    const attendances = await this.prisma.dailyAttendance.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        markedBy: {
          select: {
            id: true,
            username: true,
            icFirstName: true,
          },
        },
      },
    });
    
    // Erstelle Map für schnellen Zugriff
    const attendanceMap = new Map<string, Set<string>>();
    attendances.forEach(a => {
      const dateKey = a.date.toISOString().split('T')[0];
      const key = `${a.userId}-${dateKey}`;
      if (!attendanceMap.has(a.userId)) {
        attendanceMap.set(a.userId, new Set());
      }
      attendanceMap.get(a.userId)!.add(dateKey);
    });
    
    // Generiere Tage der Woche
    const days: string[] = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      days.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Erstelle Übersicht für jeden User
    const userAttendance = users.map(user => ({
      user,
      attendance: days.reduce((acc, day) => {
        acc[day] = attendanceMap.get(user.id)?.has(day) || false;
        return acc;
      }, {} as Record<string, boolean>),
      totalDays: attendanceMap.get(user.id)?.size || 0,
    }));
    
    return {
      week: weekString,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      days,
      users: userAttendance,
    };
  }

  // Anwesenheit markieren
  async markAttendance(user: any, data: { userIds: string[]; date: string }) {
    // Prüfe Berechtigung
    const canMark = await this.canMarkAttendance(user);
    if (!canMark) {
      throw new ForbiddenException('Du hast keine Berechtigung, Anwesenheiten einzutragen');
    }
    
    const dateObj = new Date(data.date);
    
    // Erstelle Anwesenheiten für alle User
    const results = await Promise.all(
      data.userIds.map(async (userId) => {
        try {
          return await this.prisma.dailyAttendance.create({
            data: {
              date: dateObj,
              userId,
              markedById: user.id,
            },
          });
        } catch (error: any) {
          // Ignoriere Duplikate
          if (error.code === 'P2002') {
            return null;
          }
          throw error;
        }
      })
    );
    
    return {
      created: results.filter(r => r !== null).length,
      skipped: results.filter(r => r === null).length,
    };
  }

  // Anwesenheit entfernen
  async removeAttendance(user: any, data: { userIds: string[]; date: string }) {
    // Prüfe Berechtigung
    const canMark = await this.canMarkAttendance(user);
    if (!canMark) {
      throw new ForbiddenException('Du hast keine Berechtigung, Anwesenheiten zu entfernen');
    }
    
    const dateObj = new Date(data.date);
    
    const result = await this.prisma.dailyAttendance.deleteMany({
      where: {
        userId: { in: data.userIds },
        date: dateObj,
      },
    });
    
    return { deleted: result.count };
  }

  // Statistiken abrufen
  async getStats(weeks: number = 4) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (weeks * 7));
    
    // Hole alle Anwesenheiten im Zeitraum
    const attendances = await this.prisma.dailyAttendance.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        userId: true,
      },
    });
    
    // Zähle Anwesenheiten pro User
    const countMap = new Map<string, number>();
    attendances.forEach(a => {
      countMap.set(a.userId, (countMap.get(a.userId) || 0) + 1);
    });
    
    // Hole User-Daten
    const userIds = Array.from(countMap.keys());
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        username: true,
        icFirstName: true,
        icLastName: true,
        avatarUrl: true,
      },
    });
    
    const userMap = new Map(users.map(u => [u.id, u]));
    
    // Erstelle sortierte Liste
    const stats = Array.from(countMap.entries())
      .map(([userId, count]) => ({
        user: userMap.get(userId),
        count,
      }))
      .filter(s => s.user)
      .sort((a, b) => b.count - a.count);
    
    // Hole auch alle User ohne Anwesenheiten
    const allUsers = await this.prisma.user.findMany({
      where: {
        role: { notIn: ['FUTURO', 'GAST'] },
        id: { notIn: userIds },
      },
      select: {
        id: true,
        username: true,
        icFirstName: true,
        icLastName: true,
        avatarUrl: true,
      },
    });
    
    const inactive = allUsers.map(u => ({ user: u, count: 0 }));
    
    return {
      period: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        weeks,
      },
      topActive: stats.slice(0, 10),
      mostInactive: [...inactive, ...stats.filter(s => s.count < 3)].slice(0, 10),
      totalAttendances: attendances.length,
    };
  }

  // Berechtigungen abrufen
  async getPermissions() {
    return this.prisma.attendancePermission.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            icFirstName: true,
            icLastName: true,
            avatarUrl: true,
            role: true,
          },
        },
        grantedBy: {
          select: {
            id: true,
            username: true,
            icFirstName: true,
          },
        },
      },
      orderBy: { grantedAt: 'desc' },
    });
  }

  // Berechtigung erteilen
  async grantPermission(user: any, userId: string) {
    if (!this.isLeadership(user)) {
      throw new ForbiddenException('Nur Leadership kann Berechtigungen erteilen');
    }
    
    // Prüfe ob User existiert
    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!targetUser) {
      throw new BadRequestException('User nicht gefunden');
    }
    
    return this.prisma.attendancePermission.create({
      data: {
        userId,
        grantedById: user.id,
      },
      include: {
        user: {
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

  // Berechtigung entziehen
  async revokePermission(user: any, userId: string) {
    if (!this.isLeadership(user)) {
      throw new ForbiddenException('Nur Leadership kann Berechtigungen entziehen');
    }
    
    return this.prisma.attendancePermission.delete({
      where: { userId },
    });
  }

  // Hilfsfunktion: Berechne Wochendaten
  private getWeekDates(year: number, weekNumber: number): { startDate: Date; endDate: Date } {
    // ISO Week: Montag ist Tag 1
    const jan4 = new Date(year, 0, 4);
    const dayOfWeek = jan4.getDay() || 7;
    const startOfYear = new Date(jan4);
    startOfYear.setDate(jan4.getDate() - dayOfWeek + 1);
    
    const startDate = new Date(startOfYear);
    startDate.setDate(startOfYear.getDate() + (weekNumber - 1) * 7);
    
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    
    return { startDate, endDate };
  }

  // Hilfsfunktion: Aktuelle Woche als String
  getCurrentWeekString(): string {
    const now = new Date();
    const onejan = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil(((now.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${week.toString().padStart(2, '0')}`;
  }
}

