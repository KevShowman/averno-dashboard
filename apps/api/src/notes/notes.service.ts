import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

const USER_SELECT = {
  id: true,
  username: true,
  icFirstName: true,
  icLastName: true,
};

const NOTE_INCLUDE = {
  createdBy: { select: USER_SELECT },
  updatedBy: { select: USER_SELECT },
  archivedBy: { select: USER_SELECT },
};

@Injectable()
export class NotesService {
  constructor(private prisma: PrismaService) {}

  private isLeadership(user: any): boolean {
    const leadershipRoles = ['PATRON', 'DON', 'CAPO', 'ADMIN'];
    if (leadershipRoles.includes(user.role)) return true;
    const allRoles = user.allRoles || [];
    return allRoles.some((role: string) => leadershipRoles.includes(role));
  }

  private async hasListPermission(userId: string): Promise<boolean> {
    const permission = await this.prisma.listPermission.findUnique({
      where: { userId },
    });
    return !!permission;
  }

  private async canEditNote(user: any, noteCreatedById: string): Promise<boolean> {
    if (user.id === noteCreatedById) return true;
    if (this.isLeadership(user)) return true;
    return this.hasListPermission(user.id);
  }

  async findAll() {
    return this.prisma.note.findMany({
      orderBy: [
        { isArchived: 'asc' },
        { createdAt: 'desc' },
      ],
      include: NOTE_INCLUDE,
    });
  }

  async create(user: any, data: { content: string }) {
    return this.prisma.note.create({
      data: {
        content: data.content,
        createdById: user.id,
      },
      include: NOTE_INCLUDE,
    });
  }

  async update(user: any, id: string, data: { content: string }) {
    const note = await this.prisma.note.findUnique({ where: { id } });
    if (!note) throw new NotFoundException('Notiz nicht gefunden');

    if (note.isArchived) {
      throw new ForbiddenException('Archivierte Notizen können nicht bearbeitet werden');
    }

    if (!(await this.canEditNote(user, note.createdById))) {
      throw new ForbiddenException('Keine Berechtigung zum Bearbeiten dieser Notiz');
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.note.update({
        where: { id },
        data: {
          content: data.content,
          updatedById: user.id,
        },
        include: NOTE_INCLUDE,
      }),
      this.prisma.noteHistory.create({
        data: {
          noteId: id,
          content: note.content, // save the old content before overwriting
          editedById: user.id,
        },
      }),
    ]);

    return updated;
  }

  async toggleArchive(user: any, id: string) {
    const note = await this.prisma.note.findUnique({ where: { id } });
    if (!note) throw new NotFoundException('Notiz nicht gefunden');

    if (!(await this.canEditNote(user, note.createdById))) {
      throw new ForbiddenException('Keine Berechtigung zum Archivieren dieser Notiz');
    }

    const nowArchived = !note.isArchived;
    return this.prisma.note.update({
      where: { id },
      data: {
        isArchived: nowArchived,
        archivedAt: nowArchived ? new Date() : null,
        archivedById: nowArchived ? user.id : null,
      },
      include: NOTE_INCLUDE,
    });
  }

  async getHistory(id: string) {
    const note = await this.prisma.note.findUnique({ where: { id } });
    if (!note) throw new NotFoundException('Notiz nicht gefunden');

    return this.prisma.noteHistory.findMany({
      where: { noteId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        editedBy: { select: USER_SELECT },
      },
    });
  }

  async delete(user: any, id: string) {
    const note = await this.prisma.note.findUnique({ where: { id } });
    if (!note) throw new NotFoundException('Notiz nicht gefunden');

    if (!(await this.canEditNote(user, note.createdById))) {
      throw new ForbiddenException('Keine Berechtigung zum Löschen dieser Notiz');
    }

    return this.prisma.note.delete({ where: { id } });
  }
}
