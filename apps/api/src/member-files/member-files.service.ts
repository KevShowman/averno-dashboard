import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { FileEntryType } from '@prisma/client';

@Injectable()
export class MemberFilesService {
  constructor(private prisma: PrismaService) {}

  async getAllFiles(includeArchived: boolean = false) {
    const files = await this.prisma.memberFile.findMany({
      where: includeArchived ? {} : { isArchived: false },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            icFirstName: true,
            icLastName: true,
            role: true,
            avatarUrl: true,
          },
        },
        entries: {
          include: {
            createdBy: {
              select: {
                id: true,
                username: true,
                icFirstName: true,
                icLastName: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return files;
  }

  async getUsersPendingUprank() {
    const files = await this.prisma.memberFile.findMany({
      where: {
        isArchived: false,
        lastUprankDate: {
          not: null,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            icFirstName: true,
            icLastName: true,
            role: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        lastUprankDate: 'asc', // Älteste zuerst
      },
    });

    // Berechne Tage seit letztem Uprank
    const now = new Date();
    const filesWithDays = files.map(file => {
      const daysSinceUprank = file.lastUprankDate
        ? Math.floor((now.getTime() - file.lastUprankDate.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        ...file,
        daysSinceUprank,
      };
    });

    return filesWithDays;
  }

  async getFileByUserId(userId: string) {
    // Prüfe ob User existiert
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User nicht gefunden');
    }

    // Hole oder erstelle Akte
    let file = await this.prisma.memberFile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            icFirstName: true,
            icLastName: true,
            role: true,
            avatarUrl: true,
          },
        },
        entries: {
          include: {
            createdBy: {
              select: {
                id: true,
                username: true,
                icFirstName: true,
                icLastName: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!file) {
      // Erstelle neue Akte
      file = await this.prisma.memberFile.create({
        data: {
          userId,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              icFirstName: true,
              icLastName: true,
              role: true,
              avatarUrl: true,
            },
          },
          entries: true,
        },
      });
    }

    return file;
  }

  async addEntry(
    userId: string,
    type: FileEntryType,
    content: string,
    createdById: string,
  ) {
    // Stelle sicher dass Akte existiert
    let file = await this.prisma.memberFile.findUnique({
      where: { userId },
    });

    if (!file) {
      file = await this.prisma.memberFile.create({
        data: { userId },
      });
    }

    const entry = await this.prisma.memberFileEntry.create({
      data: {
        fileId: file.id,
        type,
        content,
        createdById,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            icFirstName: true,
            icLastName: true,
          },
        },
      },
    });

    return {
      message: 'Eintrag erfolgreich hinzugefügt',
      entry,
    };
  }

  async deleteEntry(entryId: string) {
    await this.prisma.memberFileEntry.delete({
      where: { id: entryId },
    });

    return {
      message: 'Eintrag erfolgreich gelöscht',
    };
  }

  async updateLastUprank(userId: string, lastUprankDate: Date) {
    // Stelle sicher dass Akte existiert
    let file = await this.prisma.memberFile.findUnique({
      where: { userId },
    });

    if (!file) {
      file = await this.prisma.memberFile.create({
        data: {
          userId,
          lastUprankDate,
        },
      });
    } else {
      file = await this.prisma.memberFile.update({
        where: { userId },
        data: { lastUprankDate },
      });
    }

    return {
      message: 'Letzter Uprank erfolgreich aktualisiert',
      lastUprankDate,
    };
  }

  async archiveFile(userId: string) {
    const file = await this.prisma.memberFile.update({
      where: { userId },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    });

    return {
      message: 'Akte erfolgreich archiviert',
      file,
    };
  }

  async restoreFile(userId: string) {
    const file = await this.prisma.memberFile.update({
      where: { userId },
      data: {
        isArchived: false,
        archivedAt: null,
      },
    });

    return {
      message: 'Akte erfolgreich wiederhergestellt',
      file,
    };
  }
}

