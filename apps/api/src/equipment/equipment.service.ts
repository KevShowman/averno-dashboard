import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { WeaponType } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { ExclusionService } from '../common/exclusion/exclusion.service';

// DTOs
interface CreateWeaponDto {
  userId: string;
  weaponType: WeaponType;
  receivedAt?: string;
  lastLostAt?: string;
  hasTaschenlampe?: boolean;
  hasTrommelmagazin?: boolean;
  hasSchalldaempfer?: boolean;
  hasGriff?: boolean;
  hasErwMagazin?: boolean;
  hasZielfernrohr?: boolean;
  note?: string;
}

interface UpdateWeaponDto {
  weaponType?: WeaponType;
  receivedAt?: string;
  lastLostAt?: string;
  hasTaschenlampe?: boolean;
  hasTrommelmagazin?: boolean;
  hasSchalldaempfer?: boolean;
  hasGriff?: boolean;
  hasErwMagazin?: boolean;
  hasZielfernrohr?: boolean;
  note?: string;
}

interface CreateVestDto {
  userId: string;
  quantity: number;
  receivedAt?: string;
  note?: string;
}

interface CreateAmmoDto {
  userId: string;
  quantity: number;
  receivedAt?: string;
  note?: string;
}

@Injectable()
export class EquipmentService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private exclusionService: ExclusionService,
  ) {}

  // ============ WAFFEN ============

  // Alle Waffen abrufen
  async getAllWeapons() {
    return this.prisma.equipmentWeapon.findMany({
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
        createdBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Waffen eines Users abrufen
  async getUserWeapons(userId: string) {
    return this.prisma.equipmentWeapon.findMany({
      where: { userId },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Waffe erstellen
  async createWeapon(data: CreateWeaponDto, createdById: string) {
    // Prüfe ob User existiert
    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!user) {
      throw new NotFoundException('User nicht gefunden');
    }

    const weapon = await this.prisma.equipmentWeapon.create({
      data: {
        userId: data.userId,
        weaponType: data.weaponType,
        receivedAt: data.receivedAt ? new Date(data.receivedAt) : new Date(),
        lastLostAt: data.lastLostAt ? new Date(data.lastLostAt) : null,
        hasTaschenlampe: data.hasTaschenlampe || false,
        hasTrommelmagazin: data.hasTrommelmagazin || false,
        hasSchalldaempfer: data.hasSchalldaempfer || false,
        hasGriff: data.hasGriff || false,
        hasErwMagazin: data.hasErwMagazin || false,
        hasZielfernrohr: data.hasZielfernrohr || false,
        note: data.note,
        createdById,
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
      userId: createdById,
      action: 'EQUIPMENT_WEAPON_CREATE',
      entity: 'EquipmentWeapon',
      entityId: weapon.id,
      meta: {
        targetUserId: data.userId,
        targetUserName: `${weapon.user.icFirstName} ${weapon.user.icLastName}`,
        weaponType: data.weaponType,
      },
    });

    return weapon;
  }

  // Waffe aktualisieren
  async updateWeapon(id: string, data: UpdateWeaponDto, updatedById: string) {
    const weapon = await this.prisma.equipmentWeapon.findUnique({
      where: { id },
      include: { user: { select: { icFirstName: true, icLastName: true } } },
    });

    if (!weapon) {
      throw new NotFoundException('Waffe nicht gefunden');
    }

    const updated = await this.prisma.equipmentWeapon.update({
      where: { id },
      data: {
        ...(data.weaponType && { weaponType: data.weaponType }),
        ...(data.receivedAt && { receivedAt: new Date(data.receivedAt) }),
        ...(data.lastLostAt !== undefined && { 
          lastLostAt: data.lastLostAt ? new Date(data.lastLostAt) : null 
        }),
        ...(data.hasTaschenlampe !== undefined && { hasTaschenlampe: data.hasTaschenlampe }),
        ...(data.hasTrommelmagazin !== undefined && { hasTrommelmagazin: data.hasTrommelmagazin }),
        ...(data.hasSchalldaempfer !== undefined && { hasSchalldaempfer: data.hasSchalldaempfer }),
        ...(data.hasGriff !== undefined && { hasGriff: data.hasGriff }),
        ...(data.hasErwMagazin !== undefined && { hasErwMagazin: data.hasErwMagazin }),
        ...(data.hasZielfernrohr !== undefined && { hasZielfernrohr: data.hasZielfernrohr }),
        ...(data.note !== undefined && { note: data.note }),
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
      userId: updatedById,
      action: 'EQUIPMENT_WEAPON_UPDATE',
      entity: 'EquipmentWeapon',
      entityId: id,
      meta: {
        targetUserName: `${weapon.user.icFirstName} ${weapon.user.icLastName}`,
        changes: data,
      },
    });

    return updated;
  }

  // Waffe löschen
  async deleteWeapon(id: string, deletedById: string) {
    const weapon = await this.prisma.equipmentWeapon.findUnique({
      where: { id },
      include: { user: { select: { id: true, icFirstName: true, icLastName: true } } },
    });

    if (!weapon) {
      throw new NotFoundException('Waffe nicht gefunden');
    }

    await this.prisma.equipmentWeapon.delete({
      where: { id },
    });

    // Audit Log
    await this.auditService.log({
      userId: deletedById,
      action: 'EQUIPMENT_WEAPON_DELETE',
      entity: 'EquipmentWeapon',
      entityId: id,
      meta: {
        targetUserId: weapon.userId,
        targetUserName: `${weapon.user.icFirstName} ${weapon.user.icLastName}`,
        weaponType: weapon.weaponType,
      },
    });

    return { message: 'Waffe erfolgreich gelöscht' };
  }

  // ============ WESTEN ============

  // Alle Westen abrufen
  async getAllVests() {
    return this.prisma.equipmentVest.findMany({
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
        createdBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Westen eines Users abrufen
  async getUserVests(userId: string) {
    return this.prisma.equipmentVest.findMany({
      where: { userId },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Westen erstellen
  async createVest(data: CreateVestDto, createdById: string) {
    // Prüfe ob User existiert
    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!user) {
      throw new NotFoundException('User nicht gefunden');
    }

    if (data.quantity <= 0) {
      throw new BadRequestException('Anzahl muss größer als 0 sein');
    }

    // Berechne erwartetes Verbrauchsdatum (1 Weste pro Tag)
    const receivedAt = data.receivedAt ? new Date(data.receivedAt) : new Date();
    const expectedEmptyAt = new Date(receivedAt);
    expectedEmptyAt.setDate(expectedEmptyAt.getDate() + data.quantity);

    const vest = await this.prisma.equipmentVest.create({
      data: {
        userId: data.userId,
        quantity: data.quantity,
        receivedAt,
        expectedEmptyAt,
        note: data.note,
        createdById,
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
      userId: createdById,
      action: 'EQUIPMENT_VEST_CREATE',
      entity: 'EquipmentVest',
      entityId: vest.id,
      meta: {
        targetUserId: data.userId,
        targetUserName: `${vest.user.icFirstName} ${vest.user.icLastName}`,
        quantity: data.quantity,
      },
    });

    return vest;
  }

  // Westen-Eintrag löschen
  async deleteVest(id: string, deletedById: string) {
    const vest = await this.prisma.equipmentVest.findUnique({
      where: { id },
      include: { user: { select: { id: true, icFirstName: true, icLastName: true } } },
    });

    if (!vest) {
      throw new NotFoundException('Westen-Eintrag nicht gefunden');
    }

    await this.prisma.equipmentVest.delete({
      where: { id },
    });

    // Audit Log
    await this.auditService.log({
      userId: deletedById,
      action: 'EQUIPMENT_VEST_DELETE',
      entity: 'EquipmentVest',
      entityId: id,
      meta: {
        targetUserId: vest.userId,
        targetUserName: `${vest.user.icFirstName} ${vest.user.icLastName}`,
        quantity: vest.quantity,
      },
    });

    return { message: 'Westen-Eintrag erfolgreich gelöscht' };
  }

  // ============ MUNITION ============

  // Alle Munition abrufen
  async getAllAmmo() {
    return this.prisma.equipmentAmmo.findMany({
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
        createdBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Munition eines Users abrufen
  async getUserAmmo(userId: string) {
    return this.prisma.equipmentAmmo.findMany({
      where: { userId },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Munition erstellen
  async createAmmo(data: CreateAmmoDto, createdById: string) {
    // Prüfe ob User existiert
    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!user) {
      throw new NotFoundException('User nicht gefunden');
    }

    if (data.quantity <= 0) {
      throw new BadRequestException('Anzahl muss größer als 0 sein');
    }

    // Berechne erwartetes Verbrauchsdatum (2 Pakete pro Tag)
    const receivedAt = data.receivedAt ? new Date(data.receivedAt) : new Date();
    const expectedEmptyAt = new Date(receivedAt);
    const daysUntilEmpty = Math.ceil(data.quantity / 2); // 2 Pakete pro Tag
    expectedEmptyAt.setDate(expectedEmptyAt.getDate() + daysUntilEmpty);

    const ammo = await this.prisma.equipmentAmmo.create({
      data: {
        userId: data.userId,
        quantity: data.quantity,
        receivedAt,
        expectedEmptyAt,
        note: data.note,
        createdById,
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
      userId: createdById,
      action: 'EQUIPMENT_AMMO_CREATE',
      entity: 'EquipmentAmmo',
      entityId: ammo.id,
      meta: {
        targetUserId: data.userId,
        targetUserName: `${ammo.user.icFirstName} ${ammo.user.icLastName}`,
        quantity: data.quantity,
      },
    });

    return ammo;
  }

  // Munitions-Eintrag löschen
  async deleteAmmo(id: string, deletedById: string) {
    const ammo = await this.prisma.equipmentAmmo.findUnique({
      where: { id },
      include: { user: { select: { id: true, icFirstName: true, icLastName: true } } },
    });

    if (!ammo) {
      throw new NotFoundException('Munitions-Eintrag nicht gefunden');
    }

    await this.prisma.equipmentAmmo.delete({
      where: { id },
    });

    // Audit Log
    await this.auditService.log({
      userId: deletedById,
      action: 'EQUIPMENT_AMMO_DELETE',
      entity: 'EquipmentAmmo',
      entityId: id,
      meta: {
        targetUserId: ammo.userId,
        targetUserName: `${ammo.user.icFirstName} ${ammo.user.icLastName}`,
        quantity: ammo.quantity,
      },
    });

    return { message: 'Munitions-Eintrag erfolgreich gelöscht' };
  }

  // ============ ÜBERSICHT ============

  // Komplette Ausrüstung eines Users
  async getUserEquipment(userId: string) {
    const [weapons, vests, ammo] = await Promise.all([
      this.getUserWeapons(userId),
      this.getUserVests(userId),
      this.getUserAmmo(userId),
    ]);

    // Berechne verbleibende Westen
    const now = new Date();
    const vestsRemaining = vests.reduce((total, vest) => {
      const daysRemaining = Math.max(0, Math.ceil((vest.expectedEmptyAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      return total + daysRemaining;
    }, 0);

    // Berechne verbleibende Munition
    const ammoRemaining = ammo.reduce((total, a) => {
      const daysRemaining = Math.max(0, Math.ceil((a.expectedEmptyAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      return total + (daysRemaining * 2); // 2 Pakete pro Tag
    }, 0);

    return {
      weapons,
      vests,
      ammo,
      summary: {
        weaponCount: weapons.length,
        vestsRemaining,
        ammoRemaining,
      },
    };
  }

  // Statistiken
  async getStats() {
    const [totalWeapons, totalVests, totalAmmo] = await Promise.all([
      this.prisma.equipmentWeapon.count(),
      this.prisma.equipmentVest.count(),
      this.prisma.equipmentAmmo.count(),
    ]);

    // Waffen nach Typ
    const weaponsByType = await this.prisma.equipmentWeapon.groupBy({
      by: ['weaponType'],
      _count: { weaponType: true },
    });

    // User ohne Waffe
    const usersWithWeapons = await this.prisma.equipmentWeapon.findMany({
      select: { userId: true },
      distinct: ['userId'],
    });
    const usersWithWeaponIds = usersWithWeapons.map(u => u.userId);

    const usersWithoutWeapons = await this.prisma.user.count({
      where: {
        id: { notIn: usersWithWeaponIds },
        isPartner: false,
        isTaxi: false,
      },
    });

    // User mit niedrigem Westen-/Munitionsstand (weniger als 3 Tage)
    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);

    const lowVestUsers = await this.prisma.equipmentVest.findMany({
      where: {
        expectedEmptyAt: { lte: threeDaysFromNow },
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
      distinct: ['userId'],
    });

    const lowAmmoUsers = await this.prisma.equipmentAmmo.findMany({
      where: {
        expectedEmptyAt: { lte: threeDaysFromNow },
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
      distinct: ['userId'],
    });

    return {
      totalWeapons,
      totalVests,
      totalAmmo,
      weaponsByType: weaponsByType.map(w => ({
        type: w.weaponType,
        count: w._count.weaponType,
      })),
      usersWithoutWeapons,
      lowVestUsers: lowVestUsers.map(v => v.user),
      lowAmmoUsers: lowAmmoUsers.map(a => a.user),
    };
  }

  // Verfügbare Waffentypen
  getWeaponTypes() {
    return [
      { key: 'SMG', name: 'SMG', description: 'Maschinenpistole' },
      { key: 'ADV', name: 'ADV', description: 'Advanced' },
      { key: 'KARABINER', name: 'Karabiner', description: 'Standard Karabiner' },
      { key: 'SPEZIALKARABINER', name: 'Spezialkarabiner', description: 'Spezial Karabiner' },
      { key: 'PDW', name: 'PDW', description: 'Personal Defense Weapon' },
      { key: 'AK47', name: 'AK-47', description: 'Sturmgewehr' },
      { key: 'TOMMY_GUN', name: 'Tommy Gun', description: 'Thompson Maschinenpistole' },
    ];
  }

  // Verfügbare Aufsätze
  getAttachments() {
    return [
      { key: 'hasTaschenlampe', name: 'Taschenlampe' },
      { key: 'hasTrommelmagazin', name: 'Trommelmagazin' },
      { key: 'hasSchalldaempfer', name: 'Schalldämpfer' },
      { key: 'hasGriff', name: 'Griff' },
      { key: 'hasErwMagazin', name: 'Erweitertes Magazin' },
      { key: 'hasZielfernrohr', name: 'Zielfernrohr' },
    ];
  }

  // Waffen-Empfehlungsstatus für alle Mitglieder
  async getWeaponRecommendations() {
    const now = new Date();
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

    // Hole alle aktiven BloodRecords
    const bloodRecords = await this.prisma.bloodRecord.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { bloodinTimestamp: 'asc' },
    });

    // Hole alle User mit Waffen
    const usersWithWeapons = await this.prisma.equipmentWeapon.findMany({
      select: { userId: true },
      distinct: ['userId'],
    });
    const weaponUserIds = new Set(usersWithWeapons.map(w => w.userId));

    // Hole alle User mit ihren Rollen (keine ausgeschlossenen)
    const allUsersRaw = await this.prisma.user.findMany({
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

    // Filter ausgeschlossene User (Discord-Rolle)
    const allUsers = allUsersRaw.filter(u => !this.exclusionService.hasExcludedRole(u.discordRoles));

    // Erstelle Map für schnellen Zugriff
    const userMap = new Map(allUsers.map(u => [
      `${u.icFirstName?.toLowerCase()}_${u.icLastName?.toLowerCase()}`,
      u
    ]));

    // Verarbeite jeden BloodRecord
    const recommendations = bloodRecords.map(record => {
      // Finde den passenden User
      const userKey = `${record.vorname.toLowerCase()}_${record.nachname.toLowerCase()}`;
      const user = userMap.get(userKey);
      
      const bloodinDate = new Date(record.bloodinTimestamp);
      const daysSinceBloodIn = Math.floor((now.getTime() - bloodinDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Prüfe ob User eine Waffe hat
      const hasWeapon = user ? weaponUserIds.has(user.id) : false;
      
      // Prüfe ob User Sicario ist
      const allRoles = user?.allRoles as string[] || [];
      const isSicario = user?.role === 'SICARIO' || allRoles.includes('SICARIO');
      
      // Berechne Status
      let status: 'green' | 'yellow' | 'red' | 'priority';
      let statusText: string;
      let priority: number;
      
      if (hasWeapon) {
        status = 'green';
        statusText = 'Hat Waffe';
        priority = 0;
      } else if (isSicario) {
        status = 'priority';
        statusText = 'SICARIO - Dringend!';
        priority = 100;
      } else if (bloodinDate < fourWeeksAgo) {
        status = 'red';
        statusText = `${daysSinceBloodIn} Tage - Überfällig!`;
        priority = 3;
      } else if (bloodinDate < twoWeeksAgo) {
        status = 'yellow';
        statusText = `${daysSinceBloodIn} Tage - Bald fällig`;
        priority = 2;
      } else {
        status = 'green';
        statusText = `${daysSinceBloodIn} Tage - OK`;
        priority = 1;
      }
      
      return {
        bloodRecord: {
          id: record.id,
          vorname: record.vorname,
          nachname: record.nachname,
          telefon: record.telefon,
          bloodinTimestamp: record.bloodinTimestamp,
        },
        user: user ? {
          id: user.id,
          username: user.username,
          icFirstName: user.icFirstName,
          icLastName: user.icLastName,
          avatarUrl: user.avatarUrl,
          role: user.role,
        } : null,
        hasWeapon,
        isSicario,
        daysSinceBloodIn,
        status,
        statusText,
        priority,
      };
    });

    // Sortiere: Priority zuerst, dann nach Tagen absteigend
    recommendations.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return b.daysSinceBloodIn - a.daysSinceBloodIn;
    });

    // Statistiken
    const stats = {
      total: recommendations.length,
      withWeapon: recommendations.filter(r => r.hasWeapon).length,
      withoutWeapon: recommendations.filter(r => !r.hasWeapon).length,
      priority: recommendations.filter(r => r.status === 'priority').length,
      red: recommendations.filter(r => r.status === 'red').length,
      yellow: recommendations.filter(r => r.status === 'yellow').length,
      green: recommendations.filter(r => r.status === 'green').length,
    };

    return { recommendations, stats };
  }
}
