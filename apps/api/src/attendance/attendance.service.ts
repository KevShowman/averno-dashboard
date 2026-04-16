import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ExclusionService } from '../common/exclusion/exclusion.service';

@Injectable()
export class AttendanceService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private exclusionService: ExclusionService,
  ) {}

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
    
    // Hole alle User (aktive Mitglieder, keine Partner/Taxi/Ausgeschlossene)
    const usersRaw = await this.prisma.user.findMany({
      where: {
        role: { notIn: ['FUTURO', 'GAST'] },
        isPartner: false,
        isTaxi: false,
      },
      select: {
        id: true,
        username: true,
        icFirstName: true,
        icLastName: true,
        role: true,
        avatarUrl: true,
        discordRoles: true,
      },
      orderBy: [
        { icFirstName: 'asc' },
        { username: 'asc' },
      ],
    });

    // Filter ausgeschlossene User (Discord-Rolle)
    const users = usersRaw.filter(u => !this.exclusionService.hasExcludedRole(u.discordRoles));
    
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
      // Format date without UTC conversion
      const d = new Date(a.date);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!attendanceMap.has(a.userId)) {
        attendanceMap.set(a.userId, new Set());
      }
      attendanceMap.get(a.userId)!.add(dateKey);
    });
    
    // Generiere Tage der Woche (ohne UTC-Konvertierung)
    const days: string[] = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      // Format as YYYY-MM-DD without UTC conversion
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      days.push(`${year}-${month}-${day}`);
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
    
    // Helper function for local date formatting
    const formatLocalDate = (d: Date) => 
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    return {
      week: weekString,
      startDate: formatLocalDate(startDate),
      endDate: formatLocalDate(endDate),
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
    
    const createdCount = results.filter(r => r !== null).length;

    // Audit Log (nur wenn tatsächlich Einträge erstellt wurden)
    if (createdCount > 0) {
      await this.auditService.log({
        userId: user.id,
        action: 'ATTENDANCE_MARKED',
        entity: 'DailyAttendance',
        entityId: data.date,
        meta: {
          date: data.date,
          userIds: data.userIds,
          createdCount,
          skippedCount: results.filter(r => r === null).length,
        },
      });
    }

    return {
      created: createdCount,
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

    // Audit Log (nur wenn tatsächlich Einträge gelöscht wurden)
    if (result.count > 0) {
      await this.auditService.log({
        userId: user.id,
        action: 'ATTENDANCE_REMOVED',
        entity: 'DailyAttendance',
        entityId: data.date,
        meta: {
          date: data.date,
          userIds: data.userIds,
          deletedCount: result.count,
        },
      });
    }
    
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
    
    // Hole User-Daten (keine Partner/Taxi/Ausgeschlossene)
    const userIds = Array.from(countMap.keys());
    const usersRaw2 = await this.prisma.user.findMany({
      where: { 
        id: { in: userIds },
        isPartner: false,
        isTaxi: false,
      },
      select: {
        id: true,
        username: true,
        icFirstName: true,
        icLastName: true,
        avatarUrl: true,
        discordRoles: true,
      },
    });

    // Filter ausgeschlossene User (Discord-Rolle)
    const users = usersRaw2.filter(u => !this.exclusionService.hasExcludedRole(u.discordRoles));
    
    const userMap = new Map(users.map(u => [u.id, u]));
    
    // Erstelle sortierte Liste
    const stats = Array.from(countMap.entries())
      .map(([userId, count]) => ({
        user: userMap.get(userId),
        count,
      }))
      .filter(s => s.user)
      .sort((a, b) => b.count - a.count);
    
    // Hole auch alle User ohne Anwesenheiten (keine Partner/Taxi/Ausgeschlossene)
    const allUsersRaw = await this.prisma.user.findMany({
      where: {
        role: { notIn: ['FUTURO', 'GAST'] },
        id: { notIn: userIds },
        isPartner: false,
        isTaxi: false,
      },
      select: {
        id: true,
        username: true,
        icFirstName: true,
        icLastName: true,
        avatarUrl: true,
        discordRoles: true,
      },
    });

    // Filter ausgeschlossene User (Discord-Rolle)
    const allUsers = allUsersRaw.filter(u => !this.exclusionService.hasExcludedRole(u.discordRoles));
    
    const inactive = allUsers.map(u => ({ user: u, count: 0 }));
    
    // Helper function for local date formatting
    const formatLocalDate = (d: Date) => 
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    return {
      period: {
        startDate: formatLocalDate(startDate),
        endDate: formatLocalDate(endDate),
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
    
    const permission = await this.prisma.attendancePermission.create({
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

    // Audit Log
    await this.auditService.log({
      userId: user.id,
      action: 'ATTENDANCE_PERMISSION_GRANTED',
      entity: 'AttendancePermission',
      entityId: permission.id,
      meta: {
        targetUserId: userId,
        targetUsername: targetUser.username,
      },
    });

    return permission;
  }

  // Berechtigung entziehen
  async revokePermission(user: any, userId: string) {
    if (!this.isLeadership(user)) {
      throw new ForbiddenException('Nur Leadership kann Berechtigungen entziehen');
    }

    // Hole Permission für Audit-Log
    const permission = await this.prisma.attendancePermission.findUnique({
      where: { userId },
      include: {
        user: {
          select: { username: true },
        },
      },
    });
    
    const result = await this.prisma.attendancePermission.delete({
      where: { userId },
    });

    // Audit Log
    if (permission) {
      await this.auditService.log({
        userId: user.id,
        action: 'ATTENDANCE_PERMISSION_REVOKED',
        entity: 'AttendancePermission',
        entityId: permission.id,
        meta: {
          targetUserId: userId,
          targetUsername: permission.user?.username,
        },
      });
    }

    return result;
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

  // Detaillierte Statistiken mit Blood-In Daten
  async getDetailedStats() {
    // GLOBAL START DATE - Tracking began on this date
    const TRACKING_START_DATE = new Date('2025-12-13');
    TRACKING_START_DATE.setHours(0, 0, 0, 0);

    // Hole alle aktiven User (keine Partner/Taxi/Ausgeschlossene)
    const usersRaw3 = await this.prisma.user.findMany({
      where: {
        role: { notIn: ['FUTURO', 'GAST'] },
        isPartner: false,
        isTaxi: false,
      },
      select: {
        id: true,
        username: true,
        icFirstName: true,
        icLastName: true,
        role: true,
        avatarUrl: true,
        discordRoles: true,
      },
    });

    // Filter ausgeschlossene User (Discord-Rolle)
    const users = usersRaw3.filter(u => !this.exclusionService.hasExcludedRole(u.discordRoles));

    // Hole alle Blood Records (aktiv)
    const bloodRecords = await this.prisma.bloodRecord.findMany({
      where: { status: 'ACTIVE' },
      select: {
        vorname: true,
        nachname: true,
        bloodinTimestamp: true,
      },
    });

    // Hole ALLE Anwesenheiten
    const allAttendances = await this.prisma.dailyAttendance.findMany({
      select: {
        userId: true,
        date: true,
      },
    });

    // Zähle Anwesenheiten pro User
    const attendanceCountMap = new Map<string, number>();
    const userAttendanceDates = new Map<string, Date[]>();
    
    allAttendances.forEach(a => {
      attendanceCountMap.set(a.userId, (attendanceCountMap.get(a.userId) || 0) + 1);
      if (!userAttendanceDates.has(a.userId)) {
        userAttendanceDates.set(a.userId, []);
      }
      userAttendanceDates.get(a.userId)!.push(a.date);
    });

    // Berechne Statistiken pro User
    const now = new Date();
    
    // German timezone offset calculation
    // Create a date in German timezone to determine if it's past 17:00
    const germanTimeFormatter = new Intl.DateTimeFormat('de-DE', {
      timeZone: 'Europe/Berlin',
      hour: 'numeric',
      hour12: false,
    });
    const germanHour = parseInt(germanTimeFormatter.format(now));
    
    const userStats = users.map(user => {
      // Finde Blood Record für diesen User (case-insensitive name matching)
      const bloodRecord = bloodRecords.find(br => 
        br.vorname?.toLowerCase() === user.icFirstName?.toLowerCase() &&
        br.nachname?.toLowerCase() === user.icLastName?.toLowerCase()
      );

      const bloodInDate = bloodRecord?.bloodinTimestamp || null;
      const totalAttendance = attendanceCountMap.get(user.id) || 0;
      const attendanceDates = userAttendanceDates.get(user.id) || [];

      // Berechne Tage seit Tracking-Start (nicht vor TRACKING_START_DATE)
      let daysSinceTrackingOrBloodIn = 0;
      let attendancePercentage = 0;
      
      // "Today" only counts as a full day after 17:00 German time
      // Before 17:00, we consider the day as not yet started for statistics
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // If before 17:00 German time, don't count today in the statistics yet
      if (germanHour < 17) {
        today.setDate(today.getDate() - 1);
      }
      
      // Determine effective start date
      let effectiveStartDate = TRACKING_START_DATE;
      
      if (bloodInDate) {
        const bloodInDay = new Date(bloodInDate);
        bloodInDay.setHours(0, 0, 0, 0);
        
        // Use the LATER of blood-in date or tracking start date
        if (bloodInDay > TRACKING_START_DATE) {
          effectiveStartDate = bloodInDay;
        }
      }
      
      // Calculate days from effective start date
      daysSinceTrackingOrBloodIn = Math.floor((today.getTime() - effectiveStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1; // +1 to include today
      
      // Only count attendance AFTER effective start date
      const validAttendances = attendanceDates.filter(d => {
        const attendanceDate = new Date(d);
        attendanceDate.setHours(0, 0, 0, 0);
        return attendanceDate >= effectiveStartDate;
      }).length;
      
      // Calculate percentage based on valid tracking period
      if (daysSinceTrackingOrBloodIn > 0) {
        attendancePercentage = Math.round((validAttendances / daysSinceTrackingOrBloodIn) * 100);
      }

      // Berechne aktuelle Streak
      let currentStreak = 0;
      if (attendanceDates.length > 0) {
        const sortedDates = attendanceDates
          .map(d => new Date(d))
          .sort((a, b) => b.getTime() - a.getTime());
        
        let checkDate = new Date(today);
        for (const date of sortedDates) {
          const d = new Date(date);
          d.setHours(0, 0, 0, 0);
          
          if (d.getTime() === checkDate.getTime()) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else if (d.getTime() < checkDate.getTime()) {
            break;
          }
        }
      }

      // Berechne letzte 7 Tage (but not before tracking start)
      // Also respects the 17:00 cutoff via the adjusted 'today'
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // -6 because today is already counted
      sevenDaysAgo.setHours(0, 0, 0, 0);
      const effectiveSevenDaysAgo = sevenDaysAgo > TRACKING_START_DATE ? sevenDaysAgo : TRACKING_START_DATE;
      const last7DaysCount = attendanceDates.filter(d => {
        const date = new Date(d);
        date.setHours(0, 0, 0, 0);
        return date >= effectiveSevenDaysAgo && date <= today;
      }).length;
      
      // Calculate actual days in last 7 days period (capped at tracking start and adjusted for 17:00 cutoff)
      const actualLast7Days = Math.max(0, Math.min(7, Math.floor((today.getTime() - TRACKING_START_DATE.getTime()) / (1000 * 60 * 60 * 24)) + 1));

      // Berechne letzte 30 Tage (but not before tracking start)
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29); // -29 because today is already counted
      thirtyDaysAgo.setHours(0, 0, 0, 0);
      const effectiveThirtyDaysAgo = thirtyDaysAgo > TRACKING_START_DATE ? thirtyDaysAgo : TRACKING_START_DATE;
      const last30DaysCount = attendanceDates.filter(d => {
        const date = new Date(d);
        date.setHours(0, 0, 0, 0);
        return date >= effectiveThirtyDaysAgo && date <= today;
      }).length;
      
      // Calculate actual days in last 30 days period (capped at tracking start and adjusted for 17:00 cutoff)
      const actualLast30Days = Math.max(0, Math.min(30, Math.floor((today.getTime() - TRACKING_START_DATE.getTime()) / (1000 * 60 * 60 * 24)) + 1));

      return {
        user,
        bloodInDate,
        daysSinceBloodIn: daysSinceTrackingOrBloodIn,
        totalAttendance: validAttendances, // Only count valid attendances
        attendancePercentage: Math.min(attendancePercentage, 100), // Cap at 100%
        currentStreak,
        last7Days: last7DaysCount,
        last30Days: last30DaysCount,
        last7DaysPercentage: actualLast7Days > 0 ? Math.round((last7DaysCount / actualLast7Days) * 100) : 0,
        last30DaysPercentage: actualLast30Days > 0 ? Math.round((last30DaysCount / actualLast30Days) * 100) : 0,
        actualLast7Days,
        actualLast30Days,
      };
    });

    // Sortiere nach verschiedenen Kriterien
    const byPercentage = [...userStats]
      .filter(s => s.bloodInDate && s.daysSinceBloodIn > 7) // Nur User mit Blood-In und mind. 7 Tage
      .sort((a, b) => b.attendancePercentage - a.attendancePercentage);

    const byStreak = [...userStats]
      .sort((a, b) => b.currentStreak - a.currentStreak);

    const byLast7Days = [...userStats]
      .sort((a, b) => b.last7Days - a.last7Days);

    const byTotal = [...userStats]
      .sort((a, b) => b.totalAttendance - a.totalAttendance);

    // Gesamt-Statistiken
    const totalUsers = users.length;
    const usersWithBloodIn = userStats.filter(s => s.bloodInDate).length;
    const avgPercentage = usersWithBloodIn > 0
      ? Math.round(userStats.filter(s => s.bloodInDate && s.daysSinceBloodIn > 7).reduce((sum, s) => sum + s.attendancePercentage, 0) / usersWithBloodIn)
      : 0;
    const avgLast7Days = Math.round(userStats.reduce((sum, s) => sum + s.last7Days, 0) / totalUsers * 10) / 10;

    // Calculate days since tracking started (with 17:00 cutoff)
    const overviewToday = new Date();
    overviewToday.setHours(0, 0, 0, 0);
    // Apply same 17:00 cutoff rule
    if (germanHour < 17) {
      overviewToday.setDate(overviewToday.getDate() - 1);
    }
    const daysSinceTrackingStart = Math.max(0, Math.floor((overviewToday.getTime() - TRACKING_START_DATE.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    return {
      userStats,
      rankings: {
        byPercentage: byPercentage.slice(0, 15),
        byStreak: byStreak.slice(0, 10),
        byLast7Days: byLast7Days.slice(0, 10),
        byTotal: byTotal.slice(0, 10),
        lowestPercentage: byPercentage.slice(-10).reverse(),
      },
      overview: {
        totalUsers,
        usersWithBloodIn,
        avgPercentage,
        avgLast7Days,
        totalAttendances: allAttendances.length,
        trackingStartDate: `${TRACKING_START_DATE.getFullYear()}-${String(TRACKING_START_DATE.getMonth() + 1).padStart(2, '0')}-${String(TRACKING_START_DATE.getDate()).padStart(2, '0')}`,
        daysSinceTrackingStart,
      },
    };
  }
}

