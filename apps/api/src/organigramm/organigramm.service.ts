import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export interface RoleAssignmentDto {
  roleId: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

@Injectable()
export class OrganigrammService {
  constructor(private prisma: PrismaService) {}

  async getAllAssignments(): Promise<Record<string, RoleAssignmentDto[]>> {
    const assignments = await this.prisma.organigrammAssignment.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            icFirstName: true,
            icLastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Gruppiere nach roleId
    const grouped: Record<string, RoleAssignmentDto[]> = {};
    for (const assignment of assignments) {
      if (!grouped[assignment.roleId]) {
        grouped[assignment.roleId] = [];
      }
      grouped[assignment.roleId].push({
        roleId: assignment.roleId,
        userId: assignment.user.id,
        username: assignment.user.username,
        displayName:
          assignment.user.icFirstName && assignment.user.icLastName
            ? `${assignment.user.icFirstName} ${assignment.user.icLastName}`
            : assignment.user.username,
        avatarUrl: assignment.user.avatarUrl || undefined,
      });
    }

    return grouped;
  }

  async assignUserToRole(roleId: string, userId: string): Promise<RoleAssignmentDto> {
    // Prüfe ob User existiert
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        icFirstName: true,
        icLastName: true,
        avatarUrl: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Benutzer nicht gefunden');
    }

    // Prüfe ob bereits zugewiesen
    const existing = await this.prisma.organigrammAssignment.findUnique({
      where: {
        roleId_userId: {
          roleId,
          userId,
        },
      },
    });

    if (existing) {
      // Bereits zugewiesen, gib die Daten zurück
      return {
        roleId,
        userId: user.id,
        username: user.username,
        displayName:
          user.icFirstName && user.icLastName
            ? `${user.icFirstName} ${user.icLastName}`
            : user.username,
        avatarUrl: user.avatarUrl || undefined,
      };
    }

    // Erstelle neue Zuweisung
    await this.prisma.organigrammAssignment.create({
      data: {
        roleId,
        userId,
      },
    });

    return {
      roleId,
      userId: user.id,
      username: user.username,
      displayName:
        user.icFirstName && user.icLastName
          ? `${user.icFirstName} ${user.icLastName}`
          : user.username,
      avatarUrl: user.avatarUrl || undefined,
    };
  }

  async removeUserFromRole(roleId: string, userId: string): Promise<void> {
    await this.prisma.organigrammAssignment.deleteMany({
      where: {
        roleId,
        userId,
      },
    });
  }

  async removeAllAssignments(): Promise<void> {
    await this.prisma.organigrammAssignment.deleteMany();
  }
}

