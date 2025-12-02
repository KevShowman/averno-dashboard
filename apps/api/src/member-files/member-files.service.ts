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
    // Hole ALLE User aus der Datenbank
    const allUsers = await this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        icFirstName: true,
        icLastName: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    // Hole alle Member Files
    const files = await this.prisma.memberFile.findMany({
      where: {
        isArchived: false,
      },
      select: {
        id: true,
        userId: true,
        lastUprankDate: true,
      },
    });

    // Erstelle eine Map für schnellen Zugriff
    const filesByUserId = new Map(files.map(f => [f.userId, f]));

    const now = new Date();

    // Kombiniere User mit ihren Files
    const usersWithUprank = allUsers.map(user => {
      const file = filesByUserId.get(user.id);
      
      // Wenn kein File existiert oder kein lastUprankDate, verwende createdAt des Users
      // Das bedeutet: "noch nie upgerankt" = Zeit seit Account-Erstellung
      const referenceDate = file?.lastUprankDate || user.createdAt;
      const daysSinceUprank = Math.floor(
        (now.getTime() - new Date(referenceDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        id: file?.id || `temp-${user.id}`,
        userId: user.id,
        lastUprankDate: file?.lastUprankDate || null,
        isArchived: false,
        user: {
          id: user.id,
          username: user.username,
          icFirstName: user.icFirstName,
          icLastName: user.icLastName,
          role: user.role,
          avatarUrl: user.avatarUrl,
        },
        daysSinceUprank,
        neverUpranked: !file?.lastUprankDate, // Flag für Frontend
      };
    });

    // Filtere: Nur User mit mindestens 14 Tagen seit letztem Uprank (oder nie upgerankt)
    const MIN_DAYS_FOR_UPRANK = 14;
    const filteredUsers = usersWithUprank.filter(u => 
      u.neverUpranked || u.daysSinceUprank >= MIN_DAYS_FOR_UPRANK
    );

    // Sortiere: User ohne Uprank zuerst (längste Zeit), dann nach daysSinceUprank
    filteredUsers.sort((a, b) => {
      // Nie upgerankte User haben Priorität
      if (a.neverUpranked && !b.neverUpranked) return -1;
      if (!a.neverUpranked && b.neverUpranked) return 1;
      // Dann nach Tagen sortieren (höchste zuerst)
      return b.daysSinceUprank - a.daysSinceUprank;
    });

    return filteredUsers;
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

