import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class CommunicationService {
  constructor(private prisma: PrismaService) {}

  async getCommunicationInfo() {
    const [funkSetting, darkChatSetting] = await Promise.all([
      this.prisma.settings.findUnique({ where: { key: 'funk_frequency' } }),
      this.prisma.settings.findUnique({ where: { key: 'darkchat_name' } }),
    ]);

    return {
      funkFrequency: funkSetting?.value || '00100200321',
      darkChatName: darkChatSetting?.value || 'LsCFuT25veRDc!2§',
    };
  }

  async updateFunkFrequency(funkFrequency: string) {
    await this.prisma.settings.upsert({
      where: { key: 'funk_frequency' },
      update: { value: funkFrequency, type: 'string' },
      create: { key: 'funk_frequency', value: funkFrequency, type: 'string' },
    });

    return {
      message: 'Funk-Frequenz erfolgreich aktualisiert',
      funkFrequency,
    };
  }

  async updateDarkChatName(darkChatName: string) {
    await this.prisma.settings.upsert({
      where: { key: 'darkchat_name' },
      update: { value: darkChatName, type: 'string' },
      create: { key: 'darkchat_name', value: darkChatName, type: 'string' },
    });

    return {
      message: 'DarkChat-Name erfolgreich aktualisiert',
      darkChatName,
    };
  }
}

