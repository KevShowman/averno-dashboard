import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Role } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async getAllUsers() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateUserRole(userId: string, role: Role, updatedById: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    await this.auditService.log({
      userId: updatedById,
      action: 'USER_ROLE_UPDATE',
      entity: 'User',
      entityId: userId,
      meta: {
        oldRole: user.role,
        newRole: role,
        targetUser: user.username,
      },
    });

    return updatedUser;
  }

  async makeAdminByDiscordId(discordId: string, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { discordId } });
    if (!user) {
      throw new Error('Benutzer mit dieser Discord ID nicht gefunden. Der Benutzer muss sich mindestens einmal angemeldet haben.');
    }

    if (user.role === Role.EL_PATRON) {
      throw new Error('Benutzer ist bereits El Patron');
    }

    const updatedUser = await this.prisma.user.update({
      where: { discordId },
      data: { role: Role.EL_PATRON },
    });

    await this.auditService.log({
      userId: adminId,
      action: 'ADMIN_CREATED',
      entity: 'User',
      entityId: user.id,
      meta: {
        oldRole: user.role,
        newRole: Role.EL_PATRON,
        targetUser: user.username,
        discordId,
      },
    });

    return updatedUser;
  }
}
